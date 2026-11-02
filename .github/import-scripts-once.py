import argparse,concurrent.futures,hashlib,json,pathlib,re,shutil,subprocess,tempfile,urllib.parse
ap=argparse.ArgumentParser();ap.add_argument('--root',default='.');ap.add_argument('--data',required=True);ap.add_argument('--local');args=ap.parse_args();root=pathlib.Path(args.root).resolve();data=pathlib.Path(args.data).resolve()
plan={'files':[]}
for f in sorted(data.glob('*.json')):
 d=json.loads(f.read_text());plan['files'].extend(d.pop('files',[]));plan.update(d)
rawbase='https://raw.githubusercontent.com/linuszlx/Loonx/main/'
mapping={x['url']:rawbase+urllib.parse.quote(x['path'],safe='/') for x in plan['files']}
depfiles={x['file']:x['urls'] for x in plan['dependencies']}
def sha(b):return hashlib.sha256(b).hexdigest()
def safe_path(p):
 q=pathlib.Path(p);assert not q.is_absolute() and '..' not in q.parts;return root/q
def get(entry):
 path=safe_path(entry['path'])
 if args.local:b=(pathlib.Path(args.local)/pathlib.Path(entry['path']).relative_to('Script')).read_bytes()
 else:
  with tempfile.TemporaryDirectory() as tmp:
   dest=pathlib.Path(tmp)/'body'
   subprocess.run(['curl','-fLsS','--connect-timeout','15','--max-time','120','--retry','3','-A','Loon/3.5.2','-o',str(dest),entry['url']],check=True)
   b=dest.read_bytes()
 assert sha(b)==entry['source_sha256'],f"Upstream changed: {entry['url']}"
 text=b.decode('utf-8');changes=[]
 for url in depfiles.get(entry['path'],[]):
  if url in mapping and mapping[url]!=url:
   replacement=mapping[url]
   if entry['path'].endswith('/JingDong.price.js') and url.startswith('https://cdnjs.cloudflare.com/'):
    replacement='https://cdn.jsdelivr.net/gh/linuszlx/Loonx@main/'+urllib.parse.quote(next(r['path'] for r in plan['files'] if r['url']==url),safe='/')
   count=text.count(url)
   if count:text=text.replace(url,replacement);changes.append({'url':url,'replacement':replacement,'count':count})
 output=text.encode('utf-8');path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(output)
 return {**entry,'mirror_url':mapping[entry['url']],'bytes':len(output),'sha256':sha(output),'dependency_replacements':changes}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:script_rows=list(pool.map(get,plan['files']))
script_rows.sort(key=lambda x:x['url'])
script_pattern=re.compile(r'''(\bscript\(\s*["'])(https?://[^"']+)(["'])|(\bscript-path\s*=\s*)(https?://[^\s,]+)''')
plugin_rows=[];changed=0;replaced=0;remaining={}
for f in sorted((root/'Plugin').glob('*.lpx')):
 b=f.read_bytes();assert sha(b)==plan['plugin_source_sha256'][f.name],f'Plugin changed: {f.name}'
 counts=[0]
 def sub(m):
  url=m[2] or m[5]
  if url in mapping:counts[0]+=1;return (m[1]+mapping[url]+m[3]) if m[2] else (m[4]+mapping[url])
  remaining.setdefault(url,set()).add(f.name);return m[0]
 out=''.join(line if line.lstrip().startswith('#') else script_pattern.sub(sub,line) for line in b.decode('utf-8').splitlines(keepends=True)).encode('utf-8')
 f.write_bytes(out);changed+=bool(counts[0]);replaced+=counts[0]
 plugin_rows.append({'filename':f.name,'url':'https://loon.103516.xyz/Plugin/'+f.name,'source_sha256':sha(b),'bytes':len(out),'sha256':sha(out)})
for name in ['plugins.json','plugins.all.json']:
 f=root/name;d=json.loads(f.read_text())
 for p in d['plugins']:
  p['source_url']=p.get('source_url',p['url']);p['url']=rawbase+'Plugin/'+urllib.parse.quote(p['filename'])
 f.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
(root/'manifest.json').write_text(json.dumps({'source':'https://loonlab.103516.xyz/Plugin/','downloaded_at':'2026-11-02','count':len(plugin_rows),'files':plugin_rows},ensure_ascii=False,indent=2)+'\n')
manifest={'source':'https://loonlab.103516.xyz/Plugin/','downloaded_at':'2026-11-02','script_count':len(script_rows),'direct_script_count':len({u for r in script_rows for u in ([r['url']] if r['plugins'] else [])}),'plugin_files_changed':changed,'plugin_references_replaced':replaced,'files':script_rows,'missing':plan['missing'],'remaining_plugin_urls':{u:sorted(v) for u,v in sorted(remaining.items())}}
(root/'script-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
readme=root/'README.md';text=readme.read_text();text=text.replace('保留插件原始内容、作者署名及来源链接。远程脚本、规则和图标保留原链接，本备份不包含这些依赖。','已备份可获取的脚本及静态代码依赖，并将插件与代码依赖链接改为本仓库 Raw 地址。保留作者署名及来源记录。在线 API、规则和图标继续使用原地址。')
text+='\n## 脚本备份\n\n已保存 '+str(len(script_rows))+' 个脚本及代码依赖；修改 '+str(changed)+' 个插件，共替换 '+str(replaced)+' 处脚本引用。来源、原始校验值、修改后校验值及代码依赖替换记录见 [script-manifest.json](script-manifest.json)。\n\n源站拦截的 '+str(len(plan['missing']))+' 个文件保留原地址，未替换为空文件或错误页面；详情见 [SCRIPT-MISSING.md](SCRIPT-MISSING.md)。备份面向 Loon，Node.js 专用通知模块和运行时生成的订阅/API 地址仍由上游提供。\n'
readme.write_text(text)
missing='# 未能下载的脚本\n\n以下源链接被 Cloudflare 拦截（HTTP 403），对应引用保留原地址。可获取原文件后补充。\n\n| 原地址 | 引用插件 |\n| --- | --- |\n'
for r in plan['missing']:missing+='| '+r['url']+' | '+', '.join(r['plugins'])+' |\n'
(root/'SCRIPT-MISSING.md').write_text(missing)
assert len(remaining)==len(plan['missing'])
print(json.dumps({'scripts':len(script_rows),'plugins_changed':changed,'references_replaced':replaced,'missing':len(plan['missing'])}))
