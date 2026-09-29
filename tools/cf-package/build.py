#!/usr/bin/env python3
"""Build an AEM content package with the Press Release content fragment model and the
Blue September 2015 article as a content fragment.

The fragment's field values live in tools/cf-package/fragments/blue-september-2015.json (the
press release page itself now only references the fragment). parse_article() splits an imported
press-release page into the model's sections and can be used to create data files for further
releases. Writes an installable FileVault package to tools/cf-package/dist/.

  model:    /conf/vhi-ie/settings/dam/cfm/models/press-release
  fragment: /content/dam/vhi-ie/fragments/blue-september-2015
"""
import html
import json
import re
import uuid
import zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE_HTML = ROOT / 'content/about/media-releases-and-publications/2015/11.plain.html'
SOURCE_URL = 'https://www1.vhi.ie/about/media-releases-and-publications/2015/11'
DIST = Path(__file__).resolve().parent / 'dist'
FRAGMENT_DATA = Path(__file__).resolve().parent / 'fragments'

CONF = '/conf/vhi-ie'
MODEL_PATH = f'{CONF}/settings/dam/cfm/models/press-release'
FRAGMENT_FOLDER = '/content/dam/vhi-ie/fragments'
FRAGMENT_NAME = 'blue-september-2015'
FRAGMENT_PATH = f'{FRAGMENT_FOLDER}/{FRAGMENT_NAME}'
# fragments are addressed by ID in the Content Fragment Editor / Sites API: keep it stable across builds
FRAGMENT_UUID = str(uuid.uuid5(uuid.NAMESPACE_URL, f'aem:{FRAGMENT_PATH}'))
BUILT = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')
AUTHOR = 'admin'

NS = ('xmlns:sling="http://sling.apache.org/jcr/sling/1.0" '
      'xmlns:cq="http://www.day.com/jcr/cq/1.0" '
      'xmlns:jcr="http://www.jcp.org/jcr/1.0" '
      'xmlns:nt="http://www.jcp.org/jcr/nt/1.0" '
      'xmlns:dam="http://www.day.com/dam/1.0" '
      'xmlns:dc="http://purl.org/dc/elements/1.1/"')

# (name, label, metaType, required, description)
FIELDS = [
    ('title', 'Title', 'text-single', True, 'Press release headline'),
    ('publicationDate', 'Publication Date', 'date', False, 'Date the release was issued'),
    ('byline', 'Byline', 'text-single', False, 'Author / issuing office'),
    ('image', 'Image', 'reference', False, 'Optional lead image (select an image from /content/dam/vhi-ie)'),
    ('imageAlt', 'Image Alt Text', 'text-single', False, 'Describes the image for screen readers; required if an image is set'),
    ('introduction', 'Introduction', 'text-multi', False, 'Lead paragraphs'),
    ('keyPoints', 'Key Points', 'text-multi', False, 'Bulleted highlights or findings'),
    ('body', 'Body', 'text-multi', False, 'Main copy, including quotes'),
    ('notesToEditors', 'Notes to Editors', 'text-multi', False, 'Boilerplate and background for media'),
    ('sourceUrl', 'Source URL', 'text-single', False, 'Original page on vhi.ie (migration reference)'),
]


def attr(value):
    return html.escape(str(value), quote=True)


# ---------------------------------------------------------------- article parsing
class Collector(HTMLParser):
    """Collects the top-level children of the first <div> as raw HTML strings."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.depth = 0
        self.blocks = []
        self.current = None
        self.div_done = False

    def handle_starttag(self, tag, attrs):
        if self.div_done:
            return
        if tag == 'div' and self.depth == 0:
            self.depth = 1
            return
        if self.depth == 1 and self.current is None:
            self.current = {'tag': tag, 'parts': [], 'level': 0}
        if self.current is not None:
            keep = [(k, v) for k, v in attrs if k in ('href', 'src', 'alt')]
            rendered = ''.join(f' {k}="{attr(v)}"' for k, v in keep)
            self.current['parts'].append(f'<{tag}{rendered}>')
            if tag not in ('br', 'img'):
                self.current['level'] += 1

    def handle_endtag(self, tag):
        if self.div_done:
            return
        if self.current is None:
            if tag == 'div' and self.depth == 1:
                self.div_done = True
            return
        self.current['parts'].append(f'</{tag}>')
        self.current['level'] -= 1
        if self.current['level'] == 0:
            self.blocks.append((self.current['tag'], ''.join(self.current['parts'])))
            self.current = None

    def handle_data(self, data):
        if self.current is not None:
            self.current['parts'].append(data)

    def handle_entityref(self, name):
        self.handle_data(f'&{name};')

    def handle_charref(self, name):
        self.handle_data(f'&#{name};')


def text_of(fragment):
    return html.unescape(re.sub(r'<[^>]+>', '', fragment)).strip()


def load_fragment(name):
    """Field values for a fragment from its data file (dates as YYYY-MM-DD)."""
    data = json.loads((FRAGMENT_DATA / f'{name}.json').read_text(encoding='utf-8'))
    if data.get('publicationDate'):
        data['publicationDate'] = datetime.strptime(data['publicationDate'], '%Y-%m-%d')
    return data


def parse_article(source=SOURCE_HTML):
    parser = Collector()
    parser.feed(Path(source).read_text(encoding='utf-8'))
    blocks = [b for b in parser.blocks if text_of(b[1])]

    title = text_of(next(h for t, h in blocks if t == 'h1'))
    rest = [b for b in blocks if b[0] != 'h1']

    # trailing byline + date paragraphs, e.g. "Vhi_Press" / "31-Aug-2015"
    date = None
    byline = None
    if rest and re.fullmatch(r'\d{1,2}-[A-Za-z]{3}-\d{4}', text_of(rest[-1][1])):
        date = datetime.strptime(text_of(rest.pop()[1]), '%d-%b-%Y')
    if rest and len(text_of(rest[-1][1])) < 40 and not rest[-1][1].count('<a'):
        byline = text_of(rest.pop()[1])

    notes_idx = next((i for i, (_, h) in enumerate(rest) if text_of(h).lower().startswith('notes to editors')), len(rest))
    list_idx = next((i for i, (t, _) in enumerate(rest) if t in ('ul', 'ol')), None)

    main, notes = rest[:notes_idx], rest[notes_idx + 1:]
    if list_idx is not None and list_idx < notes_idx:
        intro, key_points, body = main[:list_idx], [main[list_idx]], main[list_idx + 1:]
    else:
        intro, key_points, body = main[:1], [], main[1:]

    join = lambda items: ''.join(h for _, h in items)
    return {
        'title': title,
        'publicationDate': date,
        'byline': byline or '',
        'introduction': join(intro),
        'keyPoints': join(key_points),
        'body': join(body),
        'notesToEditors': join(notes),
        'sourceUrl': SOURCE_URL,
        # the source release has no image; the fields are left empty for authors
        'image': '',
        'imageAlt': '',
    }


# ---------------------------------------------------------------- JCR docview XML
def field_xml(index, name, label, meta, required, description):
    common = (f'jcr:primaryType="nt:unstructured" fieldLabel="{attr(label)}" fieldDescription="{attr(description)}" '
              f'listOrder="{index}" metaType="{meta}" name="{name}" renderReadOnly="false" showEmptyInReadOnly="true"')
    if required:
        common += ' required="on"'
    if meta == 'text-single':
        specific = ('sling:resourceType="granite/ui/components/coral/foundation/form/textfield" '
                    'maxlength="255" valueType="string"')
    elif meta == 'text-multi':
        specific = (f'sling:resourceType="dam/cfm/admin/components/authoring/contenteditor/multieditor" '
                    f'cfm-element="{name}" default-mime-type="text/html" valueType="string"')
    elif meta == 'reference':
        specific = ('sling:resourceType="dam/cfm/models/editor/components/contentreference" '
                    'filter="hierarchy" nameSuffix="contentReference" rootPath="/content/dam/vhi-ie" '
                    'showThumbnail="true" validation="cfm.validation.contenttype.image" valueType="string"')
    else:  # date
        specific = ('sling:resourceType="granite/ui/components/coral/foundation/form/datepicker" '
                    'displayedFormat="YYYY-MM-DD" type="date" valueFormat="YYYY-MM-DD[T]HH:mm:ss.000Z" '
                    'valueType="calendar/date"')
    node = f'_x0031_7590000000{index:02d}'
    return f'                        <{node} {common} {specific}/>'


def model_xml():
    fields = '\n'.join(field_xml(i + 1, *f) for i, f in enumerate(FIELDS))
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS}
    jcr:primaryType="cq:Template"
    allowedPaths="[/content/entities(/.*)?]"
    ranking="{{Long}}100">
    <jcr:content
        cq:lastModified="{{Date}}{BUILT}"
        cq:lastModifiedBy="{AUTHOR}"
        cq:scaffolding="{MODEL_PATH}/jcr:content/model"
        cq:templateType="/libs/settings/dam/cfm/model-types/fragment"
        jcr:primaryType="cq:PageContent"
        jcr:title="Press Release"
        jcr:description="Vhi media release: headline, date, byline, optional image, introduction, key points, body and notes to editors"
        sling:resourceSuperType="dam/cfm/models/console/components/data/entity"
        sling:resourceType="dam/cfm/models/console/components/data/entity/default"
        status="enabled">
        <model
            cq:targetPath="/content/entities"
            jcr:primaryType="cq:PageContent"
            sling:resourceType="wcm/scaffolding/components/scaffolding"
            dataTypesConfig="/mnt/overlay/settings/dam/cfm/models/formbuilderconfig/datatypes"
            maxGeneratedOrder="{len(FIELDS)}">
            <cq:dialog
                jcr:primaryType="nt:unstructured"
                sling:resourceType="cq/gui/components/authoring/dialog">
                <content
                    jcr:primaryType="nt:unstructured"
                    sling:resourceType="granite/ui/components/coral/foundation/fixedcolumns">
                    <items
                        jcr:primaryType="nt:unstructured"
                        maxGeneratedOrder="{len(FIELDS)}">
{fields}
                    </items>
                </content>
            </cq:dialog>
        </model>
    </jcr:content>
</jcr:root>
'''


def fragment_xml(article):
    props = []
    for name, _label, meta, _req, _desc in FIELDS:
        value = article.get(name)
        if meta == 'date':
            if value:
                props.append(f'{name}="{{Date}}{value.strftime("%Y-%m-%dT00:00:00.000Z")}"')
            continue
        if meta == 'reference':
            # asset path, e.g. /content/dam/vhi-ie/images/blue-september.jpg; omitted until an author
            # picks one (an empty string is not a valid reference)
            if value:
                props.append(f'{name}="{attr(value)}"')
            continue
        props.append(f'{name}="{attr(value or "")}"')
        props.append(f'{name}_x0040_ContentType="{"text/html" if meta == "text-multi" else "text/plain"}"')
    master = '\n                '.join(props)
    title = attr(article['title'])
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS}
    jcr:primaryType="dam:Asset"
    jcr:mixinTypes="[mix:referenceable]"
    jcr:uuid="{FRAGMENT_UUID}">
    <jcr:content
        cq:name="{FRAGMENT_NAME}"
        cq:parentPath="{FRAGMENT_FOLDER}"
        contentFragment="{{Boolean}}true"
        jcr:lastModified="{{Date}}{BUILT}"
        jcr:lastModifiedBy="{AUTHOR}"
        jcr:primaryType="dam:AssetContent"
        jcr:title="{title}"
        jcr:description="Vhi press release, {article['publicationDate'].strftime('%d %B %Y') if article['publicationDate'] else ''}">
        <data
            cq:model="{MODEL_PATH}"
            jcr:primaryType="nt:unstructured">
            <master
                jcr:primaryType="nt:unstructured"
                {master}/>
        </data>
        <metadata
            jcr:primaryType="nt:unstructured"
            dc:title="{title}"/>
        <related jcr:primaryType="nt:unstructured"/>
    </jcr:content>
</jcr:root>
'''


def page_xml(title):
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS}
    jcr:primaryType="cq:Page">
    <jcr:content
        jcr:primaryType="cq:PageContent"
        jcr:title="{attr(title)}"/>
</jcr:root>
'''


def folder_xml(title, conf=None, allowed_models=()):
    """Assets folder; jcr:content carries the cloud configuration and the folder policy
    (Properties > Policies > Allowed Content Fragment Models by Path)."""
    conf_attr = f'\n        cq:conf="{conf}"' if conf else ''
    models_attr = f'\n        cq:allowedTemplates="[{",".join(allowed_models)}]"' if allowed_models else ''
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<jcr:root {NS}
    jcr:primaryType="sling:Folder">
    <jcr:content
        jcr:primaryType="nt:unstructured"
        jcr:title="{attr(title)}"{conf_attr}{models_attr}/>
</jcr:root>
'''


FILTER_XML = f'''<?xml version="1.0" encoding="UTF-8"?>
<workspaceFilter version="1.0">
    <filter root="{MODEL_PATH}"/>
    <filter root="{FRAGMENT_FOLDER}/jcr:content"/>
    <filter root="{FRAGMENT_FOLDER}/{FRAGMENT_NAME}"/>
</workspaceFilter>
'''

PROPERTIES_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE properties SYSTEM "http://java.sun.com/dtd/properties.dtd">
<properties>
<entry key="name">vhi-ie-press-release-cf</entry>
<entry key="group">vhi-ie</entry>
<entry key="version">1.3.0</entry>
<entry key="description">Press Release content fragment model + Blue September 2015 press release fragment</entry>
<entry key="requiresRoot">false</entry>
<entry key="packageType">content</entry>
</properties>
'''


def main():
    article = load_fragment(FRAGMENT_NAME)
    files = {
        'META-INF/vault/filter.xml': FILTER_XML,
        'META-INF/vault/properties.xml': PROPERTIES_XML,
        # ancestors: only created if missing (outside the filter roots, never overwritten)
        'jcr_root/conf/vhi-ie/settings/dam/.content.xml': page_xml('DAM'),
        'jcr_root/conf/vhi-ie/settings/dam/cfm/.content.xml': page_xml('Content Fragments'),
        'jcr_root/conf/vhi-ie/settings/dam/cfm/models/.content.xml': page_xml('Content Fragment Models'),
        f'jcr_root{MODEL_PATH}/.content.xml': model_xml(),
        f'jcr_root{FRAGMENT_FOLDER}/.content.xml': folder_xml('Fragments', CONF, [MODEL_PATH]),
        f'jcr_root{FRAGMENT_FOLDER}/{FRAGMENT_NAME}/.content.xml': fragment_xml(article),
    }
    DIST.mkdir(parents=True, exist_ok=True)
    out = DIST / 'vhi-ie-press-release-cf-1.3.0.zip'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, body in files.items():
            z.writestr(name, body)
    print(out.relative_to(ROOT))
    for key in ('title', 'publicationDate', 'byline'):
        print(f'  {key}: {article[key]}')
    for key in ('introduction', 'keyPoints', 'body', 'notesToEditors'):
        print(f'  {key}: {len(article[key])} chars, {article[key].count("<p>") + article[key].count("<li>")} p/li')


if __name__ == '__main__':
    main()
