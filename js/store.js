/* ============================================================
   store.js — data layer for the Memories guestbook (Firebase).

   The rest of the site talks only to window.CRAStore. This file
   is the only place that knows about Firebase.

   Backend: Cloud Firestore (Spark / free plan, no billing account).
     - Messages live in the "messages" collection.
     - Photos are downscaled in the browser and stored inline in
       the message document as a data URL (Firebase Storage needs a
       billing account, so we avoid it). Firestore's 1 MiB document
       limit is why images are compressed hard below.
     - Each visitor is signed in anonymously (no login screen).
       A message can only be edited or removed by the same browser
       that posted it (auth.uid == authorUid).
     - "Remove" sets hidden = true. Nothing is ever hard-deleted;
       every prior version is appended to the revisions array.

   Record shape (messages/{autoId}):
     {
       name, relationship, message,
       image,        // data URL string, or null
       authorUid,    // anonymous uid of the poster
       createdAt,     updatedAt,   // epoch ms (numbers)
       hidden,       // bool
       revisions: [ { name, relationship, message, image, at, deleted? } ]
     }
   ============================================================ */
(function () {
  "use strict";

  var IMAGE_TRY_DIMS = [1000, 800, 640];
  var IMAGE_TRY_QUALITIES = [0.72, 0.6, 0.5, 0.42];
  var IMAGE_MAX_CHARS = 850000; // keeps the whole doc under Firestore's 1 MiB cap

  var NAME_MAX = 80, REL_MAX = 60, MSG_MAX = 4000;

  var cfg = window.CRA_FIREBASE_CONFIG;
  var db, auth, ready;

  boot();

  function boot() {
    var unconfigured =
      !cfg || !cfg.apiKey || /^YOUR_/.test(cfg.apiKey) ||
      typeof firebase === "undefined";
    if (unconfigured) {
      ready = Promise.reject(new Error(
        "The guestbook isn't connected yet. (Firebase config not set.)"
      ));
      // Swallow the unhandled-rejection noise; callers handle it.
      ready.catch(function () {});
      return;
    }
    firebase.initializeApp(cfg);
    db = firebase.firestore();
    auth = firebase.auth();
    ready = new Promise(function (resolve, reject) {
      auth.onAuthStateChanged(function (user) { if (user) resolve(user); });
      auth.signInAnonymously().catch(function (e) {
        reject(new Error(
          "Couldn't connect to the guestbook. If this keeps happening, " +
          "make sure Anonymous sign-in is enabled in Firebase Authentication."
        ));
      });
    });
    ready.catch(function () {});
  }

  function col() { return db.collection("messages"); }
  function trim(s, max) { return (s == null ? "" : String(s)).trim().slice(0, max); }

  function friendly(err) {
    var code = err && err.code ? String(err.code) : "";
    if (code.indexOf("permission-denied") !== -1) {
      return new Error("That message can only be changed from the device that posted it.");
    }
    if (code.indexOf("unavailable") !== -1 || code.indexOf("network") !== -1) {
      return new Error("Network problem — please check your connection and try again.");
    }
    return err instanceof Error ? err : new Error("Something went wrong. Please try again.");
  }

  /* Downscale + compress an uploaded image until it fits inline. */
  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.size) return resolve(null);
      if (!/^image\//.test(file.type)) return reject(new Error("That file isn't an image."));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read that image.")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Could not open that image.")); };
        img.onload = function () {
          for (var di = 0; di < IMAGE_TRY_DIMS.length; di++) {
            var scale = Math.min(1, IMAGE_TRY_DIMS[di] / Math.max(img.naturalWidth, img.naturalHeight));
            var w = Math.round(img.naturalWidth * scale);
            var h = Math.round(img.naturalHeight * scale);
            var canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
            for (var qi = 0; qi < IMAGE_TRY_QUALITIES.length; qi++) {
              var url;
              try { url = canvas.toDataURL("image/jpeg", IMAGE_TRY_QUALITIES[qi]); }
              catch (e) { return reject(new Error("Could not process that image.")); }
              if (url.length <= IMAGE_MAX_CHARS) return resolve(url);
            }
          }
          reject(new Error("That photo is too large even after resizing — try a smaller crop."));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function view(doc) {
    var d = doc.data();
    var uid = auth.currentUser ? auth.currentUser.uid : null;
    return {
      id: doc.id,
      name: d.name,
      relationship: d.relationship || "",
      message: d.message,
      image: d.image || null,
      createdAt: new Date(d.createdAt || 0).toISOString(),
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
      edited: !!d.updatedAt && d.updatedAt !== d.createdAt,
      mine: !!uid && d.authorUid === uid
    };
  }

  function revisionOf(d, extra) {
    var r = {
      name: d.name,
      relationship: d.relationship || "",
      message: d.message,
      image: d.image || null,
      at: Date.now()
    };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }

  var CRAStore = {
    backend: "firebase",

    list: function () {
      return ready
        .then(function () { return col().orderBy("createdAt", "desc").get(); })
        .then(function (snap) {
          var out = [];
          snap.forEach(function (doc) { if (!doc.data().hidden) out.push(view(doc)); });
          return out;
        })
        .catch(function (e) { throw friendly(e); });
    },

    add: function (input) {
      return ready.then(function (user) {
        return fileToImage(input.image).then(function (image) {
          var now = Date.now();
          return col().add({
            name: trim(input.name, NAME_MAX),
            relationship: trim(input.relationship, REL_MAX),
            message: trim(input.message, MSG_MAX),
            image: image,
            authorUid: user.uid,
            createdAt: now,
            updatedAt: now,
            hidden: false,
            revisions: []
          });
        });
      }).catch(function (e) { throw friendly(e); });
    },

    update: function (id, changes) {
      return ready.then(function () {
        var ref = col().doc(id);
        return ref.get().then(function (doc) {
          if (!doc.exists) throw new Error("That message no longer exists.");
          var d = doc.data();
          var revisions = (d.revisions || []).slice();
          revisions.push(revisionOf(d));
          return ref.update({
            name: changes.name != null ? trim(changes.name, NAME_MAX) : d.name,
            relationship: changes.relationship != null ? trim(changes.relationship, REL_MAX) : (d.relationship || ""),
            message: changes.message != null ? trim(changes.message, MSG_MAX) : d.message,
            image: changes.removeImage ? null : (d.image || null),
            hidden: d.hidden || false,
            createdAt: d.createdAt,
            updatedAt: Date.now(),
            revisions: revisions
          });
        });
      }).catch(function (e) { throw friendly(e); });
    },

    // Soft delete — hidden from the page, kept in Firestore.
    remove: function (id) {
      return ready.then(function () {
        var ref = col().doc(id);
        return ref.get().then(function (doc) {
          if (!doc.exists) return;
          var d = doc.data();
          var revisions = (d.revisions || []).slice();
          revisions.push(revisionOf(d, { deleted: true }));
          return ref.update({
            name: d.name,
            relationship: d.relationship || "",
            message: d.message,
            image: d.image || null,
            hidden: true,
            createdAt: d.createdAt,
            updatedAt: Date.now(),
            revisions: revisions
          });
        });
      }).catch(function (e) { throw friendly(e); });
    },

    mine: function () { return false; } // unused; list() payload carries `mine`
  };

  window.CRAStore = CRAStore;
})();
