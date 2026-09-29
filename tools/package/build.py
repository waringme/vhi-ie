#!/usr/bin/env python3
"""Build one combined AEM content package for vhi-ie:
  - site content: press-release page, nav, footer and their DAM images (tools/site-package)
  - content fragment model + Blue September fragment (tools/cf-package)

Runs both builders, then merges their packages (files + workspace filters) into
tools/package/dist/vhi-ie-content-<version>.zip
"""
import re
import subprocess
import sys
import zipfile
from pathlib import Path

VERSION = '1.4.0'
ROOT = Path(__file__).resolve().parents[2]
BUILDERS = [ROOT / 'tools/site-package/build.py', ROOT / 'tools/cf-package/build.py']
DIST = Path(__file__).resolve().parent / 'dist'
VAULT = ('META-INF/vault/filter.xml', 'META-INF/vault/properties.xml')


def build(script):
    """Runs a builder and returns the path of the package it wrote (its first output line)."""
    out = subprocess.run([sys.executable, str(script)], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    return ROOT / out.splitlines()[0].strip()


def main():
    files = {}
    filters = []
    for script in BUILDERS:
        package = build(script)
        with zipfile.ZipFile(package) as z:
            filters += re.findall(r'<filter [^>]*/>', z.read(VAULT[0]).decode())
            for name in z.namelist():
                if name in VAULT:
                    continue
                if name in files and files[name] != z.read(name):
                    raise SystemExit(f'conflicting entry in {package.name}: {name}')
                files[name] = z.read(name)
        print(f'  merged {package.relative_to(ROOT)}')

    files[VAULT[0]] = ('<?xml version="1.0" encoding="UTF-8"?>\n<workspaceFilter version="1.0">\n'
                       + ''.join(f'    {f}\n' for f in filters) + '</workspaceFilter>\n')
    files[VAULT[1]] = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="name">vhi-ie-content</entry>
<entry key="group">vhi-ie</entry>
<entry key="version">{VERSION}</entry>
<entry key="description">Blue September 2015 press release page (driven by its content fragment via the Press Release block), nav, footer, their images, and the Press Release content fragment model + fragment</entry>
<entry key="requiresRoot">false</entry>
<entry key="packageType">content</entry>
</properties>
'''
    DIST.mkdir(parents=True, exist_ok=True)
    out = DIST / f'vhi-ie-content-{VERSION}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, body in files.items():
            z.writestr(name, body)
    print(out.relative_to(ROOT))
    print('  filters:', *(re.search(r'root="([^"]+)"', f).group(1) + (' (merge)' if 'mode="merge"' in f else '') for f in filters), sep='\n    ')


if __name__ == '__main__':
    main()
