/* ============================================================
   memories.js — UI for the Memories guestbook.

   Talks only to window.CRAStore. Builds every node with the DOM
   API (no innerHTML for user text) so a posted message can never
   inject markup.
   ============================================================ */
(function () {
  "use strict";

  var form, listEl, statusEl;
  var DEFAULT_HINT = "You can edit or remove your message afterward from this device.";

  function init() {
    form = document.getElementById("memory-form");
    listEl = document.getElementById("memory-list");
    statusEl = document.getElementById("memory-status");
    if (!form || !listEl) return;

    form.addEventListener("submit", onSubmit);
    listEl.addEventListener("click", onListClick);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ---------- rendering ---------- */

  function render() {
    CRAStore.list().then(function (messages) {
      listEl.textContent = "";
      if (!messages.length) {
        var empty = el("p", "mwall__empty", "Be the first to share a memory of Chuck.");
        listEl.appendChild(empty);
        return;
      }
      messages.forEach(function (m) {
        listEl.appendChild(card(m));
      });
    });
  }

  function card(m) {
    var art = el("article", "mnote");
    art.setAttribute("data-id", m.id);

    if (m.image) {
      var img = document.createElement("img");
      img.className = "mnote__img";
      img.src = m.image;
      img.alt = "Photo shared by " + m.name;
      img.loading = "lazy";
      art.appendChild(img);
    }

    art.appendChild(el("p", "mnote__body", m.message));

    var meta = el("p", "mnote__meta");
    meta.appendChild(el("span", "mnote__name", m.name || "Anonymous"));
    if (m.relationship) meta.appendChild(el("span", "mnote__rel", m.relationship));
    var when = formatDate(m.createdAt) + (m.edited ? " · edited" : "");
    meta.appendChild(el("span", "mnote__date", when));
    art.appendChild(meta);

    if (m.mine) {
      var actions = el("div", "mnote__actions");
      actions.appendChild(btn("Edit", "btn btn--ghost btn--sm", "edit"));
      actions.appendChild(btn("Remove", "btn btn--danger btn--sm", "remove"));
      art.appendChild(actions);
    }
    return art;
  }

  /* ---------- posting ---------- */

  function onSubmit(e) {
    e.preventDefault();
    var data = new FormData(form);
    var name = (data.get("name") || "").toString().trim();
    var message = (data.get("message") || "").toString().trim();
    var imageFile = data.get("image");
    if (imageFile && !imageFile.size) imageFile = null;

    if (!name || !message) {
      return setStatus("Please add your name and a message.", true);
    }

    setBusy(true);
    setStatus("Posting…", false);
    CRAStore.add({
      name: name,
      relationship: (data.get("relationship") || "").toString().trim(),
      message: message,
      image: imageFile
    })
      .then(function () {
        form.reset();
        setStatus("Thank you — your memory has been added.", false);
        render();
      })
      .catch(function (err) {
        setStatus(err.message || "Something went wrong. Please try again.", true);
      })
      .then(function () { setBusy(false); });
  }

  /* ---------- edit / remove ---------- */

  function onListClick(e) {
    var actionBtn = e.target.closest("[data-act]");
    if (!actionBtn) return;
    var art = e.target.closest(".mnote");
    if (!art) return;
    var id = art.getAttribute("data-id");
    var act = actionBtn.getAttribute("data-act");

    if (act === "edit") return openEditor(art, id);
    if (act === "cancel") return render();
    if (act === "remove") {
      if (!window.confirm("Remove your message? The family keeps a copy, but it will no longer appear here.")) return;
      CRAStore.remove(id)
        .then(render)
        .catch(function (err) { setStatus(err.message, true); });
    }
    if (act === "save") return saveEditor(art, id);
  }

  function openEditor(art, id) {
    CRAStore.list().then(function (messages) {
      var m = messages.filter(function (x) { return x.id === id; })[0];
      if (!m) return render();

      art.textContent = "";
      var wrap = el("div", "mnote__edit");

      var nameIn = input("text", m.name);
      nameIn.setAttribute("data-role", "name");
      nameIn.setAttribute("aria-label", "Your name");

      var relIn = input("text", m.relationship || "");
      relIn.setAttribute("data-role", "relationship");
      relIn.setAttribute("aria-label", "Relationship");
      relIn.placeholder = "relationship (optional)";

      var msgIn = document.createElement("textarea");
      msgIn.setAttribute("data-role", "message");
      msgIn.setAttribute("aria-label", "Your message");
      msgIn.rows = 4;
      msgIn.value = m.message;

      wrap.appendChild(nameIn);
      wrap.appendChild(relIn);
      wrap.appendChild(msgIn);

      if (m.image) {
        var rm = document.createElement("label");
        rm.style.fontSize = "0.85rem";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.setAttribute("data-role", "removeImage");
        rm.appendChild(cb);
        rm.appendChild(document.createTextNode(" Remove the photo"));
        wrap.appendChild(rm);
      }

      var actions = el("div", "mnote__actions");
      actions.appendChild(btn("Save", "btn btn--sm", "save"));
      actions.appendChild(btn("Cancel", "btn btn--ghost btn--sm", "cancel"));
      wrap.appendChild(actions);

      art.appendChild(wrap);
      nameIn.focus();
    });
  }

  function saveEditor(art, id) {
    var get = function (role) { return art.querySelector('[data-role="' + role + '"]'); };
    var name = get("name").value.trim();
    var message = get("message").value.trim();
    if (!name || !message) return setStatus("Name and message can't be empty.", true);
    var removeBox = get("removeImage");

    CRAStore.update(id, {
      name: name,
      relationship: get("relationship").value.trim(),
      message: message,
      removeImage: removeBox ? removeBox.checked : false
    })
      .then(function () {
        setStatus("Your message has been updated.", false);
        render();
      })
      .catch(function (err) { setStatus(err.message, true); });
  }

  /* ---------- tiny DOM helpers ---------- */

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function btn(label, className, act) {
    var b = el("button", className, label);
    b.type = "button";
    b.setAttribute("data-act", act);
    return b;
  }

  function input(type, value) {
    var i = document.createElement("input");
    i.type = type;
    i.value = value || "";
    return i;
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  }

  function setStatus(text, isError) {
    if (!statusEl) return;
    statusEl.textContent = text || DEFAULT_HINT;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function setBusy(busy) {
    var submit = form.querySelector('button[type="submit"]');
    if (submit) submit.disabled = busy;
  }
})();
