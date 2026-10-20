/* 一次只播放一支视频。音效栏不在视频页加载，让配乐独立播放。 */
(function () {
  var videos = document.querySelectorAll('video');
  videos.forEach(function (current) {
    current.addEventListener('play', function () {
      videos.forEach(function (other) {
        if (other !== current) other.pause();
      });
    });
  });
})();
