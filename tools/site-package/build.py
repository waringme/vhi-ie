#!/usr/bin/env python3
"""Build an AEM content package with the migrated press-release page, the nav and the footer
for the vhi-ie Universal Editor (xwalk) site, plus the nav/footer images as DAM assets.

Inputs (generated from the imported content):
  migration-work/jcr-content/{nav,footer}.xml
  migration-work/jcr-content/about/media-releases-and-publications/2015/11.xml
  content/images/{nav,footer}/*          (images referenced by nav/footer)

Output: tools/site-package/dist/vhi-ie-site-content-<version>.zip
"""
import html
import re
import zipfile
from pathlib import Path

VERSION = '1.0.0'
ROOT = Path(__file__).resolve().parents[2]
JCR = ROOT / 'migration-work/jcr-content'
IMAGES = ROOT / 'content/images'
DIST = Path(__file__).resolve().parent / 'dist'

SITE = '/content/vhi-ie'
DAM = '/content/dam/vhi-ie'

# (source xml relative to JCR, repository path, page title)
PAGES = [
    ('nav.xml', f'{SITE}/nav', 'Nav'),
    ('footer.xml', f'{SITE}/footer', 'Footer'),
    ('about/media-releases-and-publications/2015/11.xml',
     f'{SITE}/about/media-releases-and-publications/2015/11', None),
]
# intermediate pages, created only if they do not exist yet (outside the filter roots)
ANCESTORS = [
    (f'{SITE}/about', 'About'),
    (f'{SITE}/about/media-releases-and-publications', 'Media releases and publications'),
    (f'{SITE}/about/media-releases-and-publications/2015', '2015'),
]
IMAGE_FOLDERS = ['nav', 'footer']
MIME = {'.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'}

NS = ('xmlns:jcr="http://www.jcp.org/jcr/1.0" xmlns:nt="http://www.jcp.org/jcr/nt/1.0" '
      'xmlns:cq="http://www.day.com/jcr/cq/1.0" xmlns:sling="http://sling.apache.org/jcr/sling/1.0" '
      'xmlns:dam="http://www.day.com/dam/1.0" xmlns:dc="http://purl.org/dc/elements/1.1/"')
PAGE_TEMPLATE = 'cq:template="/libs/core/franklin/templates/page" sling:resourceType="core/franklin/components/page/v1/page"'


def page_title_from_content(xml):
    """Title of an imported page: the first title component in the JCR XML."""
    match = re.search(r'<title [^>]*\btitle="([^"]*)"', xml)
    return html.unescape(match.group(1)) if match else None


def rewrite(xml, title):
    # local preview image paths -> DAM asset paths (image components and rich text <img src>)
    xml = re.sub(r'(image="|src&#x3D;&quot;)images/(' + '|'.join(IMAGE_FOLDERS) + r')/',
                 lambda m: f'{m.group(1)}{DAM}/{m.group(2)}/', xml)
    # drop empty sections left over from the metadata table
    xml = re.sub(r'\s*<(section_\d+)[^>]*></\1>', '', xml)
    xml = re.sub(r'\s*<(section_\d+)[^>]*/>', '', xml)
    # page title
    if title and 'jcr:title=' not in xml.split('<root', 1)[0]:
        xml = xml.replace('<jcr:content ', f'<jcr:content jcr:title="{html.escape(title, quote=True)}" ', 1)
    return xml


def ancestor_xml(title):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS} jcr:primaryType="cq:Page">
  <jcr:content {PAGE_TEMPLATE} jcr:primaryType="cq:PageContent" jcr:title="{html.escape(title, quote=True)}">
    <root jcr:primaryType="nt:unstructured" sling:resourceType="core/franklin/components/root/v1/root"/>
  </jcr:content>
</jcr:root>
'''


def folder_xml(title):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS} jcr:primaryType="sling:Folder">
  <jcr:content jcr:primaryType="nt:unstructured" jcr:title="{html.escape(title, quote=True)}"/>
</jcr:root>
'''


def asset_xml(mime):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS} jcr:primaryType="dam:Asset">
  <jcr:content jcr:primaryType="dam:AssetContent">
    <metadata jcr:primaryType="nt:unstructured" dc:format="{mime}"/>
    <related jcr:primaryType="nt:unstructured"/>
    <renditions jcr:primaryType="nt:folder">
      <original/>
    </renditions>
  </jcr:content>
</jcr:root>
'''


def rendition_dir_xml(mime):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS} jcr:primaryType="nt:file">
  <jcr:content jcr:primaryType="nt:resource" jcr:mimeType="{mime}"/>
</jcr:root>
'''


def main():
    files = {}
    filters = []
    referenced = set()

    for src, path, title in PAGES:
        xml = (JCR / src).read_text(encoding='utf-8')
        xml = rewrite(xml, title or page_title_from_content(xml))
        referenced.update(re.findall(rf'{re.escape(DAM)}/([a-z]+/[^"&]+)', xml))
        files[f'jcr_root{path}/.content.xml'] = xml
        filters.append(path)

    for path, title in ANCESTORS:
        files[f'jcr_root{path}/.content.xml'] = ancestor_xml(title)

    assets = 0
    for folder in IMAGE_FOLDERS:
        dam_folder = f'{DAM}/{folder}'
        files[f'jcr_root{dam_folder}/.content.xml'] = folder_xml(folder.capitalize())
        filters.append(dam_folder)
        for image in sorted((IMAGES / folder).iterdir()):
            mime = MIME.get(image.suffix.lower())
            if not mime or image.stat().st_size == 0:
                continue
            base = f'jcr_root{dam_folder}/{image.name}'
            files[f'{base}/.content.xml'] = asset_xml(mime)
            files[f'{base}/_jcr_content/renditions/original'] = image.read_bytes()
            files[f'{base}/_jcr_content/renditions/original.dir/.content.xml'] = rendition_dir_xml(mime)
            assets += 1

    missing = sorted(r for r in referenced if not (IMAGES / r).exists())
    if missing:
        raise SystemExit(f'referenced images missing on disk: {missing}')

    filter_xml = '\n'.join(f'    <filter root="{root}"/>' for root in filters)
    files['META-INF/vault/filter.xml'] = f'''<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
{filter_xml}
</workspaceFilter>
'''
    files['META-INF/vault/properties.xml'] = f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="name">vhi-ie-site-content</entry>
<entry key="group">vhi-ie</entry>
<entry key="version">{VERSION}</entry>
<entry key="description">Blue September 2015 press release page, nav and footer (+ nav/footer images)</entry>
<entry key="requiresRoot">false</entry>
<entry key="packageType">content</entry>
</properties>
'''

    DIST.mkdir(parents=True, exist_ok=True)
    out = DIST / f'vhi-ie-site-content-{VERSION}.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, body in files.items():
            z.writestr(name, body)
    print(out.relative_to(ROOT))
    print(f'  pages: {len(PAGES)} (+{len(ANCESTORS)} ancestor pages if missing)')
    print(f'  images: {assets} DAM assets, {len(referenced)} referenced')
    print('  filters:', *filters, sep='\n    ')


if __name__ == '__main__':
    main()
