import re
GLYPH = (".g{width:14px;height:14px;flex:none;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;border-radius:var(--r-full);position:relative}"
         ".g-pend{border:1.5px solid var(--ink-3)}"
         ".g-done{background:var(--you)}"
         ".g-done::after{content:\"\";width:3px;height:7px;margin-top:-2px;border:solid var(--on-you);border-width:0 2px 2px 0;transform:rotate(45deg)}"
         ".g-attn{background:var(--attn)}"
         ".g-attn::before{content:\"\";position:absolute;left:6px;top:3px;width:2px;height:5px;border-radius:1px;background:var(--surface)}"
         ".g-attn::after{content:\"\";position:absolute;left:6px;top:9px;width:2px;height:2px;border-radius:1px;background:var(--surface)}"
         ".g-sm{width:12px;height:12px}.g-sm.g-attn::before{left:5px;top:2.5px;height:4px}.g-sm.g-attn::after{left:5px;top:7.5px}")
def apply(s):
    for rule in (r'\.g-pend\{[^}]*\}', r'\.g-done\{[^}]*\}', r'\.g-attn\{width:11px[^}]*\}'):
        s = re.sub(rule, '', s, count=1)
    s, a = re.subn(r'\.g\{width:10px;height:10px;flex:none;box-sizing:border-box;display:inline-block\}', GLYPH, s)
    s = s.replace('.row{display:grid;grid-template-columns:12px minmax(0,1fr) auto;', '.row{display:grid;grid-template-columns:14px minmax(0,1fr) auto;')
    s = s.replace('.prop .g-pend{border:1.5px solid var(--ink-3)}', '')
    s = s.replace('<span class="g g-attn" style="width: 9px; height: 8px" aria-hidden="true"></span>', '')
    return s, a
