"""把桌宠原项目的形象和台词导出成网页用的 pet-data.js。

桌面版改了形象（deskpet/sprites_default.py）或台词（config.json）之后，
在 site 文件夹里跑一次：

    python pet/export_from_deskpet.py

默认去 ../deskpet 找原项目；不在那的话把路径当参数传进来。
"""
import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DESKPET = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', '..', 'deskpet')
DESKPET = os.path.abspath(DESKPET)
sys.path.insert(0, DESKPET)

from deskpet import sprites_default as S  # noqa: E402


def rows(grid):
    return [''.join(r) for r in grid.rows]


cfg = json.load(io.open(os.path.join(DESKPET, 'config.json'), encoding='utf-8'))
data = {
    'w': S.CANVAS_W, 'h': S.CANVAS_H,
    'palette': S.PALETTE,
    'frames': {k: [rows(g) for g in v] for k, v in S.build_frames().items()},
    'note': rows(S.NOTE),
    'zzz': rows(S.ZZZ),
    # 听歌那几类台词网页上用不上
    'lines': {k: v for k, v in cfg.get('lines', {}).items() if not k.startswith('music')},
}

out = ('/* 由桌宠原项目的字符画自动导出，别手改——改形象去 deskpet/sprites_default.py，'
       '改完跑 pet/export_from_deskpet.py */\n'
       'window.PET_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
io.open(os.path.join(HERE, 'pet-data.js'), 'w', encoding='utf-8', newline='\n').write(out)
print('ok ->', os.path.join(HERE, 'pet-data.js'))
