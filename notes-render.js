/* 把 notes.js 里写的文字排成页面上的「随手写」。
   这个文件不用改，要加内容改 notes.js。 */
(function () {
  var box = document.getElementById('notes');
  if (!box || typeof window.NOTES !== 'string') return;

  var blocks = window.NOTES.trim().split(/\n\s*\n/);   // 空行分条
  var html = '';

  for (var i = 0; i < blocks.length; i++) {
    var lines = blocks[i].trim().split('\n');
    var head = lines.shift();
    var cut = head.indexOf('|');
    var date = cut < 0 ? '' : head.slice(0, cut).trim();
    var title = cut < 0 ? head.trim() : head.slice(cut + 1).trim();
    var body = lines.join(' ').trim();

    html += '<div class="note">';
    if (date) html += '<div class="date">' + date + '</div>';
    if (title) html += '<h3>' + title + '</h3>';
    if (body) html += '<p>' + body + '</p>';
    html += '</div>';
  }

  box.innerHTML = html;
})();
