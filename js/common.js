// 공통 기능: 상단 메뉴, 진행 체크 저장, 복사 버튼, 세특 질문 폼
(function () {
  const C = window.COURSE || {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } },
  };
  window.courseStore = store;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  window.esc = esc;

  // ── 상단 메뉴 + 새로고침 안내 ──
  function renderNav() {
    const page = document.body.dataset.page || "";
    const links = [
      ["index.html", "home", "홈"],
      ["lesson1.html", "1", "1차시"],
      ["lesson2.html", "2", "2차시"],
      ["lesson3.html", "3", "3차시"],
      ["lesson4.html", "4", "4차시"],
      ["lesson5.html", "5", "5차시"],
      ["teacher.html", "teacher", "교사용 안내"],
    ];
    const notice = document.createElement("div");
    notice.className = "refresh-notice";
    notice.setAttribute("role", "note");
    notice.innerHTML = '🔄 화면이 예전 그대로면 <strong>완전히 새로고침</strong>하세요 — Windows <kbd>Ctrl</kbd>+<kbd>F5</kbd> · Mac <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>';
    const nav = document.createElement("nav");
    nav.className = "top";
    nav.innerHTML = `<div class="nav-inner">
      <a href="index.html" class="logo">🤖 나만의 튜링 챗봇</a>
      <div class="nav-links">${links.map(([href, key, label]) =>
        `<a href="${href}" class="${key === page ? "active" : ""} ${key === "teacher" ? "teacher" : ""}">${label}</a>`).join("")}</div>
    </div>`;
    document.body.prepend(nav);
    document.body.prepend(notice);
  }

  // ── STEP 체크 → 진행률 저장 ──
  function initSteps() {
    const page = document.body.dataset.page;
    const steps = [...document.querySelectorAll(".step[data-id]")];
    if (!steps.length) return;
    const key = `course.progress.${page}`;
    const saved = store.get(key, {});
    const bar = document.querySelector("#progress i");
    const label = document.querySelector("#progress-label");
    function update() {
      const done = steps.filter((s) => s.classList.contains("done")).length;
      const pct = Math.round((done / steps.length) * 100);
      if (bar) bar.style.width = pct + "%";
      if (label) label.textContent = `오늘의 진행: ${done} / ${steps.length} 단계 (${pct}%)`;
      store.set(`course.percent.${page}`, pct);
    }
    steps.forEach((s, i) => {
      const id = s.dataset.id;
      const num = s.querySelector(".num");
      if (num && !num.textContent.trim()) num.textContent = i + 1;
      const box = document.createElement("label");
      box.className = "check";
      box.innerHTML = '<input type="checkbox" /> 다 했어요';
      const input = box.querySelector("input");
      input.checked = !!saved[id];
      s.classList.toggle("done", input.checked);
      input.addEventListener("change", () => {
        saved[id] = input.checked;
        s.classList.toggle("done", input.checked);
        store.set(key, saved);
        update();
      });
      s.appendChild(box);
    });
    update();
  }

  // ── 코드 복사 버튼 ──
  function initCopy() {
    document.querySelectorAll("pre.code").forEach((pre) => {
      if (pre.dataset.nocopy !== undefined) return;
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.type = "button";
      btn.textContent = "복사";
      btn.addEventListener("click", async () => {
        const text = pre.querySelector("code")?.innerText ?? pre.innerText;
        try {
          await navigator.clipboard.writeText(text.replace(/\n?복사(됨!)?$/, ""));
          btn.textContent = "복사됨!";
        } catch (e) {
          btn.textContent = "직접 선택해 복사";
        }
        setTimeout(() => (btn.textContent = "복사"), 1500);
      });
      pre.appendChild(btn);
    });
  }

  // ── 세특 질문 폼 ──
  // <section class="seteuk" data-lesson="1"></section> 자리에 그린다.
  function initSeteuk() {
    const box = document.querySelector("section.seteuk[data-lesson]");
    if (!box) return;
    const n = Number(box.dataset.lesson);
    const lesson = (C.LESSONS || {})[n];
    if (!lesson) return;
    const draftKey = `course.seteuk.draft.${n}`;
    const who = store.get("course.student", { id: "", name: "" });
    const draft = store.get(draftKey, ["", "", ""]);
    const url = (C.APPS_SCRIPT_URL || "").trim();

    box.innerHTML = `
      <h2>📝 ${n}차시 세특 질문</h2>
      <p>오늘 배운 것을 <b>내 말로</b> 정리해요. 선생님이 학생부 <b>세부능력 및 특기사항</b>을 쓸 때 참고하는 소중한 기록이에요.
        정답은 없어요. <b>내가 한 일과 생각</b>을 구체적으로 쓰면 돼요.</p>
      <form novalidate>
        <div class="who-row">
          <div><label class="f" style="font-family:'Jua',sans-serif">학번</label>
            <input type="text" name="sid" inputmode="numeric" autocomplete="off" placeholder="예) ${esc(C.STUDENT_ID_EXAMPLE || "20315")}" value="${esc(who.id)}" /></div>
          <div><label class="f" style="font-family:'Jua',sans-serif">이름</label>
            <input type="text" name="sname" autocomplete="off" placeholder="예) 김튜링" value="${esc(who.name)}" /></div>
        </div>
        ${lesson.questions.map((item, i) => `
          <div class="q">
            <label for="q${n}-${i}"><span>질문 ${i + 1}.</span>${esc(item.q)}</label>
            <div class="hint">💡 ${esc(item.hint || "")}</div>
            <textarea id="q${n}-${i}" name="a${i}" maxlength="1500" placeholder="2~5문장으로 써 보세요.">${esc(draft[i] || "")}</textarea>
            <div class="count"><span>0</span> / 1500자</div>
          </div>`).join("")}
        <div class="saved" aria-live="polite"></div>
        <div class="btn-row">
          <button class="btn secondary" type="submit">제출하기</button>
          <button class="btn ghost" type="button" data-act="clear">내 답 지우기</button>
        </div>
        <div class="result" hidden></div>
        <p class="notice">✍️ 쓰는 중인 답은 이 기기에 자동 저장돼요. 다시 제출하면 <b>마지막 제출 내용으로 바뀌어요.</b>
          학번·이름·답은 선생님의 스프레드시트에만 저장되고 친구들에게는 보이지 않아요.</p>
      </form>`;

    const form = box.querySelector("form");
    const result = box.querySelector(".result");
    const savedMsg = box.querySelector(".saved");
    const areas = [...form.querySelectorAll("textarea")];
    const show = (cls, html) => { result.hidden = false; result.className = "result " + cls; result.innerHTML = html; };

    if (!url) {
      show("bad", "아직 선생님이 제출 주소를 연결하지 않았어요. 답은 이 기기에 저장되니, 먼저 써 두고 나중에 제출해도 돼요.");
    }

    let timer;
    function saveDraft() {
      store.set(draftKey, areas.map((a) => a.value));
      store.set("course.student", { id: form.sid.value.trim(), name: form.sname.value.trim() });
      savedMsg.textContent = "✓ 이 기기에 임시 저장됨";
      clearTimeout(timer);
      timer = setTimeout(() => (savedMsg.textContent = ""), 1500);
    }
    areas.forEach((a) => {
      const counter = a.parentElement.querySelector(".count span");
      const upd = () => (counter.textContent = a.value.length);
      upd();
      a.addEventListener("input", () => { upd(); saveDraft(); });
    });
    form.sid.addEventListener("input", saveDraft);
    form.sname.addEventListener("input", saveDraft);

    form.querySelector('[data-act="clear"]').addEventListener("click", () => {
      if (!confirm("이 차시에 쓴 답을 모두 지울까요? (제출한 내용은 지워지지 않아요)")) return;
      areas.forEach((a) => { a.value = ""; a.dispatchEvent(new Event("input")); });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sid = form.sid.value.trim();
      const sname = form.sname.value.trim();
      const answers = areas.map((a) => a.value.trim());
      const pattern = new RegExp(C.STUDENT_ID_PATTERN || "^[0-9]{4,6}$");
      if (!pattern.test(sid)) return show("bad", `학번을 확인해 주세요. 예) <b>${esc(C.STUDENT_ID_EXAMPLE || "20315")}</b>`);
      if (!sname) return show("bad", "이름을 써 주세요.");
      const empty = answers.findIndex((a) => a.length < 5);
      if (empty !== -1) return show("bad", `질문 ${empty + 1}의 답을 조금 더 써 주세요. (5자 이상)`);
      if (!url) return show("bad", "아직 제출 주소가 연결되지 않았어요. 선생님께 알려 주세요. (답은 이 기기에 저장돼 있어요)");

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = "보내는 중…";
      const payload = { lesson: n, studentId: sid, studentName: sname, answers, page: location.pathname };
      try {
        // Content-Type을 지정하지 않으면 text/plain으로 보내져 별도 사전 요청 없이 Apps Script에 도착한다.
        const res = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || "알 수 없는 오류");
        show("ok", `🎉 <b>${n}차시 세특 질문을 제출했어요!</b> (${data.action === "updated" ? "이전 제출을 새 내용으로 바꿨어요" : "새로 저장됐어요"})
          <br>고치고 싶으면 수정해서 다시 제출하면 돼요.`);
        store.set(`course.submitted.${n}`, new Date().toISOString());
      } catch (err) {
        // 일부 학교망에서는 응답을 읽지 못해도 전송은 되는 경우가 있어, 한 번 더 '응답 없이' 보낸다.
        try {
          await fetch(url, { method: "POST", mode: "no-cors", body: JSON.stringify(payload) });
          show("ok", "📨 보냈어요! 학교 인터넷 환경 때문에 확인 메시지를 받지 못했어요. 선생님께 제출됐는지 확인을 부탁해도 좋아요.");
          store.set(`course.submitted.${n}`, new Date().toISOString());
        } catch (err2) {
          show("bad", `제출하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요. 답은 이 기기에 저장돼 있어요.<br><small>${esc(err.message || err)}</small>`);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = "제출하기";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderNav();
    initSteps();
    initCopy();
    initSeteuk();
  });
})();
