/* ============================================================
   store.js — data layer for the Memories guestbook.

   The rest of the site talks only to window.CRAStore and never
   needs to know where the data lives. Today that's the browser's
   own localStorage (works with zero setup, good for previewing).
   When the Firebase project exists, only this file changes:
   the same five methods get backed by Firestore + Storage.

   Record shape (identical in both backends):
     {
       id, name, relationship, message,
       image,                // data URL (local) or download URL (firebase), or null
       createdAt, updatedAt, // ISO strings
       hidden,               // true == "removed" but KEPT in the backend
       revisions: [ { name, relationship, message, image, at, deleted? } ]
     }
   Nothing is ever hard-deleted: "Remove" sets hidden = true and
   every prior version is pushed onto revisions.
   ============================================================ */
(function () {
  "use strict";

  var MESSAGES_KEY = "cra:messages";
  var TOKENS_KEY = "cra:tokens";
  var IMAGE_MAX_DIM = 1400;
  var IMAGE_QUALITY = 0.82;

  /* ---------- small helpers ---------- */

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function loadTokens() {
    return readJSON(TOKENS_KEY, {});
  }

  function rememberToken(id, token) {
    var t = loadTokens();
    t[id] = token;
    writeJSON(TOKENS_KEY, t);
  }

  /* Downscale + re-encode an uploaded image so it stays small. */
  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file) return resolve(null);
      if (!/^image\//.test(file.type)) return reject(new Error("That file isn't an image."));
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error("Could not read that image.")); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("Could not open that image.")); };
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight;
          var scale = Math.min(1, IMAGE_MAX_DIM / Math.max(w, h));
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          try {
            resolve(canvas.toDataURL("image/jpeg", IMAGE_QUALITY));
          } catch (e) {
            reject(new Error("Could not process that image."));
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function snapshot(rec, extra) {
    var s = {
      name: rec.name,
      relationship: rec.relationship,
      message: rec.message,
      image: rec.image,
      at: new Date().toISOString()
    };
    if (extra) for (var k in extra) s[k] = extra[k];
    return s;
  }

  function publicView(rec) {
    return {
      id: rec.id,
      name: rec.name,
      relationship: rec.relationship,
      message: rec.message,
      image: rec.image || null,
      createdAt: rec.createdAt,
      updatedAt: rec.updatedAt,
      edited: rec.updatedAt && rec.updatedAt !== rec.createdAt,
      mine: !!loadTokens()[rec.id]
    };
  }

  /* ---------- public API ---------- */

  var CRAStore = {
    backend: "local",

    /* Visible messages, newest first. */
    list: function () {
      var all = readJSON(MESSAGES_KEY, []);
      var visible = all
        .filter(function (r) { return !r.hidden; })
        .sort(function (a, b) { return (b.createdAt || "").localeCompare(a.createdAt || ""); })
        .map(publicView);
      return Promise.resolve(visible);
    },

    add: function (input) {
      return fileToImage(input.image).then(function (image) {
        var now = new Date().toISOString();
        var rec = {
          id: uid(),
          name: (input.name || "").trim(),
          relationship: (input.relationship || "").trim(),
          message: (input.message || "").trim(),
          image: image,
          createdAt: now,
          updatedAt: now,
          hidden: false,
          revisions: []
        };
        var token = uid();
        var all = readJSON(MESSAGES_KEY, []);
        all.push(rec);
        persist(all);
        rememberToken(rec.id, token);
        return publicView(rec);
      });
    },

    update: function (id, changes) {
      var all = readJSON(MESSAGES_KEY, []);
      var rec = find(all, id);
      if (!rec) return Promise.reject(new Error("That message no longer exists."));
      if (!loadTokens()[id]) return Promise.reject(new Error("This message can only be edited from the device that posted it."));

      var imgStep = changes.image
        ? fileToImage(changes.image)
        : Promise.resolve(changes.removeImage ? null : rec.image);

      return imgStep.then(function (image) {
        rec.revisions.push(snapshot(rec));
        if (changes.name != null) rec.name = String(changes.name).trim();
        if (changes.relationship != null) rec.relationship = String(changes.relationship).trim();
        if (changes.message != null) rec.message = String(changes.message).trim();
        rec.image = image;
        rec.updatedAt = new Date().toISOString();
        persist(all);
        return publicView(rec);
      });
    },

    /* Soft delete — hidden from the page, retained in the backend. */
    remove: function (id) {
      var all = readJSON(MESSAGES_KEY, []);
      var rec = find(all, id);
      if (!rec) return Promise.resolve();
      if (!loadTokens()[id]) return Promise.reject(new Error("This message can only be removed from the device that posted it."));
      rec.revisions.push(snapshot(rec, { deleted: true }));
      rec.hidden = true;
      rec.updatedAt = new Date().toISOString();
      persist(all);
      return Promise.resolve();
    },

    /* Does this device hold the edit token for that message? */
    mine: function (id) {
      return !!loadTokens()[id];
    }
  };

  function find(all, id) {
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function persist(all) {
    try {
      writeJSON(MESSAGES_KEY, all);
    } catch (e) {
      throw new Error(
        "This device's local storage is full — usually from large photos. " +
        "The live site (Firebase) won't have this limit."
      );
    }
  }

  window.CRAStore = CRAStore;
})();
