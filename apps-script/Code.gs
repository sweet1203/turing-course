/**
 * 나만의 튜링 챗봇 — 세특 질문 수집기 (Google Apps Script)
 *
 * ▶ 이 코드는 "스프레드시트 → 확장 프로그램 → Apps Script"에 붙여 넣어 씁니다.
 * ▶ 처음 한 번: 위쪽 함수 목록에서 setupSheets 를 고르고 ▶ 실행 → 1~5차시 탭이 만들어집니다.
 * ▶ 그다음: 배포 → 새 배포 → 웹 앱(실행: 나 / 액세스: 모든 사용자) → 받은 주소를 사이트 js/config.js 에 붙여 넣습니다.
 *
 * 탭 구성: [1차시] [2차시] [3차시] [4차시] [5차시]
 * 각 탭의 열: 제출시각 | 학번 | 이름 | 질문1 | 질문2 | 질문3 | 제출 횟수
 * 같은 학생(학번)이 같은 차시에 다시 제출하면 새 줄을 만들지 않고 그 학생의 줄을 새 내용으로 바꿉니다.
 */

// ⚠️ 질문을 바꾸면 사이트의 js/config.js 에 있는 질문도 똑같이 바꿔 주세요.
var LESSONS = {
  1: {
    title: '튜링 페르소나 설계도 만들기',
    questions: [
      '우리 모둠 튜링의 시점(언제의 튜링)과 말투를 무엇으로 정했고, 조사한 내용 중 어떤 근거로 그렇게 정했나요?',
      '‘모르는 것’과 ‘대답하지 않을 것’을 하나씩 예로 들고, 둘이 어떻게 다른지 설명해 보세요.',
      '‘기계는 생각할 수 있을까?’(모방 게임)에 대한 나의 생각과 그 이유를 써 보세요.'
    ]
  },
  2: {
    title: '튜링 자료집 data.json 만들기',
    questions: [
      '내가 쓴 자료(문서) 1건의 주제와 내용은 무엇이고, 어떤 출처로 사실을 확인했나요?',
      'keywords를 뽑을 때 친구들이 어떤 질문을 할 거라고 예상했고, 그래서 어떤 키워드를 골랐나요?',
      'JSON 형식 오류를 만나 고친 경험이나, ‘자료가 틀리면 AI도 틀린다’는 말에 대한 내 생각을 써 보세요.'
    ]
  },
  3: {
    title: '튜링과 첫 대화: 찾아보고 답하는 AI',
    questions: [
      'RAG(검색해서 답하기)가 무엇인지 내 말로 설명해 보세요.',
      '검색 예측이 빗나간 질문을 하나 골라, 왜 빗나갔는지 분석한 내용을 써 보세요.',
      'app.py(클라이언트), 모델 서버(EXAONE), GPU 컴퓨터(VESSL)가 어떻게 이어져 답이 만들어지는지 설명해 보세요.'
    ]
  },
  4: {
    title: '튜링 페르소나 디버깅: 환각 찾고 고치기',
    questions: [
      '우리 모둠이 찾은 가장 그럴듯한 환각은 무엇이었고, 근거 자료와 비교해 무엇이 틀렸나요?',
      '원인에 맞게 data.json이나 app.py를 어떻게 고쳤고, 수정 전·후 정답률은 어떻게 달라졌나요?',
      'AI가 실존 인물이 하지 않은 말을 지어낸다면 누구의 책임일까요? 내 생각과 이유를 써 보세요.'
    ]
  },
  5: {
    title: '튜링 NPC 공개와 상호 평가',
    questions: [
      '우리 튜링을 로블록스(또는 웹)에 연결할 때 서버와 API가 어떤 역할을 했는지 설명해 보세요.',
      '다른 모둠을 평가하며 배운 점과, 우리 모둠이 받은 피드백으로 고치고 싶은 점은 무엇인가요?',
      '1~5차시 프로젝트에서 내가 가장 성장한 점과, ‘인간과 AI의 공존’에 대한 나의 생각을 써 보세요.'
    ]
  }
};

// 학번 형식: 숫자 5자리 (사이트 js/config.js 의 STUDENT_ID_PATTERN 과 같게)
var STUDENT_ID_PATTERN = /^[0-9]{5}$/;
var MAX_ANSWER_LENGTH = 1500;

function sheetName_(n) {
  return n + '차시';
}

function headers_(n) {
  var q = LESSONS[n].questions;
  return ['제출시각', '학번', '이름', '질문1. ' + q[0], '질문2. ' + q[1], '질문3. ' + q[2], '제출 횟수'];
}

/** ▶ 처음 한 번 실행: 1~5차시 탭과 제목 줄을 만듭니다. 이미 있으면 제목 줄만 새로 씁니다. */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var n = 1; n <= 5; n++) {
    var name = sheetName_(n);
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var h = headers_(n);
    sh.getRange(1, 1, 1, h.length).setValues([h])
      .setFontWeight('bold').setBackground('#FFEFD9').setWrap(true).setVerticalAlignment('middle');
    sh.setFrozenRows(1);
    sh.setFrozenColumns(3);
    sh.setColumnWidth(1, 150);
    sh.setColumnWidth(2, 80);
    sh.setColumnWidth(3, 90);
    sh.setColumnWidths(4, 3, 360);
    sh.setColumnWidth(7, 80);
    sh.setRowHeight(1, 70);
    sh.getRange('B:B').setNumberFormat('@'); // 학번을 글자로 저장(앞자리 0 보존)
    sh.getRange('D:F').setWrap(true).setVerticalAlignment('top');
  }
  // 처음 만들 때 생긴 빈 기본 탭(시트1)은 비어 있으면 지웁니다.
  ['시트1', 'Sheet1'].forEach(function (name) {
    var s = ss.getSheetByName(name);
    if (s && ss.getSheets().length > 1 && s.getLastRow() === 0) ss.deleteSheet(s);
  });
  SpreadsheetApp.getActive().toast('1~5차시 탭을 준비했어요!', '세특 질문', 5);
}

/** 스프레드시트를 열 때 위쪽 메뉴에 '세특 질문' 메뉴를 추가합니다. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('세특 질문')
    .addItem('1~5차시 탭 만들기 (처음 한 번)', 'setupSheets')
    .addToUi();
}

/** 사이트의 '연결 확인' 버튼이나 브라우저에서 주소를 열었을 때 응답합니다. */
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ready = [];
  for (var n = 1; n <= 5; n++) {
    if (ss.getSheetByName(sheetName_(n))) ready.push(n);
  }
  return json_({
    ok: true,
    message: '세특 질문 수집기가 작동 중입니다.',
    spreadsheet: ss.getName(),
    lessonsReady: ready
  });
}

/** 학생이 사이트에서 '제출하기'를 누르면 실행됩니다. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); // 여러 학생이 동시에 제출해도 줄이 섞이지 않게 한 명씩 처리
    var raw = (e && e.postData && e.postData.contents) || (e && e.parameter && e.parameter.payload);
    if (!raw) throw new Error('보낸 내용이 없습니다.');
    var data = JSON.parse(raw);

    var n = Number(data.lesson);
    if (!LESSONS[n]) throw new Error('차시 번호가 올바르지 않습니다: ' + data.lesson);
    var sid = String(data.studentId || '').trim();
    var name = String(data.studentName || '').trim().slice(0, 30);
    if (!STUDENT_ID_PATTERN.test(sid)) throw new Error('학번 형식이 올바르지 않습니다.');
    if (!name) throw new Error('이름이 비어 있습니다.');
    var answers = (data.answers || []).slice(0, 3).map(function (a) {
      return String(a || '').trim().slice(0, MAX_ANSWER_LENGTH);
    });
    while (answers.length < 3) answers.push('');

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(sheetName_(n));
    if (!sh) {
      setupSheets();
      sh = ss.getSheetByName(sheetName_(n));
    }

    // 같은 학번이 이미 있으면 그 줄을 고친다.
    var lastRow = sh.getLastRow();
    var rowIndex = -1;
    var count = 1;
    if (lastRow >= 2) {
      var ids = sh.getRange(2, 2, lastRow - 1, 1).getDisplayValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]).trim() === sid) { rowIndex = i + 2; break; }
      }
    }
    var now = new Date();
    if (rowIndex > 0) {
      count = Number(sh.getRange(rowIndex, 7).getValue() || 1) + 1;
      sh.getRange(rowIndex, 1, 1, 7).setValues([[now, sid, name, answers[0], answers[1], answers[2], count]]);
    } else {
      sh.appendRow([now, sid, name, answers[0], answers[1], answers[2], count]);
      rowIndex = sh.getLastRow();
      sh.getRange(rowIndex, 2).setNumberFormat('@').setValue(sid);
    }
    return json_({ ok: true, action: count > 1 ? 'updated' : 'created', lesson: n, row: rowIndex });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
