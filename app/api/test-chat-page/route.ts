const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<title>채팅 테스트</title>
</head>
<body>
  <h1>채팅 테스트</h1>
  <form id="chat-form">
    <input type="text" id="message" placeholder="메시지를 입력하세요" />
    <button type="submit">전송</button>
  </form>
  <pre id="result"></pre>

  <script>
    document.getElementById('chat-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const message = document.getElementById('message').value;
      const resultEl = document.getElementById('result');
      resultEl.textContent = '요청 중...';

      const res = await fetch('/api/router-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      resultEl.textContent = JSON.stringify(data, null, 2);
    });
  </script>
</body>
</html>`;

export async function GET() {
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
