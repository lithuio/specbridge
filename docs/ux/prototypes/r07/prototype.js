/* Design-only fixtures. No fetch, authentication, business writes or storage. */
const icons = {
  bridge: '<path d="M4 19V7m16 12V7M4 15c3-10 13-10 16 0M2 19h20M7 11v8m10-8v8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3Z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5"/>',
  file: '<path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
  box: '<path d="m12 3 9 5v9l-9 5-9-5V8Zm0 10 9-5M3 8l9 5v9M8 5l9 5"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  message: '<path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3ZM7 8h10M7 12h6"/>',
  link: '<path d="m10 13 4-4m-6 8-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1" transform="translate(1 1) scale(.9)"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m8-11-3 3 3 3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.file}</svg>`;
const brand = () => `<span class="brand"><span class="brand-mark">${icon('bridge')}</span><span class="brand-name">SpecBridge<span style="color:var(--brand)">.</span></span></span>`;
const params = new URLSearchParams(location.search);
const page = ['login', 'dashboard', 'project'].includes(params.get('page')) ? params.get('page') : 'dashboard';
let role = ['owner', 'developer', 'client'].includes(params.get('role')) ? params.get('role') : 'owner';
let activeBucket = 'mine';
const roles = {owner: 'Owner', developer: 'Developer', client: 'Client'};
const people = {owner: ['林', '林予安'], developer: ['陈', '陈序'], client: ['许', '许知禾']};
const url = (target) => `?page=${target}&role=${role}`;
const badge = (text, kind = '') => `<span class="badge ${kind}">${text}</span>`;
const demo = (label, classes = 'button', symbol = '') => `<button type="button" class="${classes}" data-notice>${symbol ? icon(symbol) : ''}${label}</button>`;
const reviewBar = () => `<div class="review-bar"><strong>PHASE A <span aria-hidden="true">/</span> 设计评审 · 示例数据<span class="review-detail">，未连接业务 API</span></strong><nav aria-label="设计页面"><a href="${url('login')}">登录</a><a href="${url('dashboard')}">Dashboard</a><a href="${url('project')}">项目详情</a></nav></div>`;

function navItem(name, symbol, target, active = false, count = '') {
  return `<a class="nav-item ${active ? 'active' : ''}" aria-label="${name}" ${active ? 'aria-current="page"' : ''} ${target ? `href="${url(target)}"` : 'href="#" data-notice'}>${icon(symbol)}<span class="nav-text">${name}</span>${count ? `<span class="nav-count">${count}</span>` : ''}</a>`;
}

function navigation() {
  return `<button class="workspace" data-notice aria-label="${role === 'client' ? '我的客户项目' : '切换工作空间'}"><span class="initial">${role === 'client' ? '许' : '木'}</span><span class="workspace-name">${role === 'client' ? '我的客户项目' : '木序设计工作室'}<small>${role === 'client' ? '只显示你参与的项目' : '供应方工作空间'}</small></span>${icon('down')}</button>
    <div class="nav-label">工作空间</div><nav class="nav-items" aria-label="应用导航">${navItem('工作概览', 'grid', 'dashboard', page === 'dashboard')}${navItem('我的项目', 'folder', 'project', false, '3')}${role === 'owner' ? navItem('供应方成员', 'users', null) : ''}</nav>
    <div class="nav-label">当前项目 · 青禾</div><nav class="nav-items" aria-label="项目导航">${navItem('项目概览', 'folder', 'project', page === 'project')}${navItem('需求与澄清', 'file', null)}${navItem('变更与审批', 'checkCircle', null)}${navItem('交付与验收', 'box', null)}${navItem('活动记录', 'activity', null)}</nav>`;
}

function shell(content) {
  const [initial, name] = people[role];
  return `${reviewBar()}<div class="app-frame"><aside class="sidebar">${brand()}${navigation()}<div class="sidebar-guide"><h3>每一步，都有据可循。</h3><p>从需求澄清到交付验收，<br>让双方始终对齐同一份规格。</p></div><div class="sidebar-bottom"><span class="avatar">${initial}</span><div class="user-copy">${name}<small>已登录账号 · 设计示例</small></div><button class="icon-button" id="collapse" aria-label="折叠侧栏" aria-expanded="true">${icon('sidebar')}</button></div></aside>
    <div class="app-body"><header class="topbar"><div class="breadcrumbs"><button class="icon-button mobile-menu" id="open-nav" aria-label="打开导航">${icon('menu')}</button><span class="workspace-crumb">${role === 'client' ? '我的项目' : '木序设计工作室'}</span>${icon('chevron')}<span class="current">${page === 'project' ? '青禾 · 会员服务平台' : '工作概览'}</span></div><div class="context"><label class="context-label" for="role">评审角色</label><select id="role" aria-label="评审角色"><option value="owner" ${role === 'owner' ? 'selected' : ''}>Owner 视图</option><option value="developer" ${role === 'developer' ? 'selected' : ''}>Developer 视图</option><option value="client" ${role === 'client' ? 'selected' : ''}>Client 视图</option></select></div></header><main class="content" id="main" tabindex="-1">${content}</main></div></div>`;
}

const ownerTasks = {
  mine: [
    ['checkCircle', '', '供应方审批', '待你确认', '会员积分与订单抵扣', '青禾 · 会员服务平台', '冻结 v2 · 等待供应方审批', '阅读并确认这一版商业评估'],
    ['message', 'amber', '需求澄清', '项目协作', '预约取消与定金退还规则', '山岚 · 预约系统', '仍有问题待澄清', '查看问题并补充澄清'],
    ['file', '', '完善评估', '待你处理', '内容发布与审核流程', '未白 · 内容平台', '商业评估草稿', '继续完善商业评估'],
  ],
  waiting: [
    ['clock', 'amber', '客户审批', '等待客户', '会员等级与成长值规则', '青禾 · 会员服务平台', '冻结 v1 · 供应方已批准', '查看客户审批进度'],
    ['box', '', '交付验收', '等待客户', '预约记录与通知设置', '山岚 · 预约系统', 'v1 / D1 · 已提交验收', '查看交付及验收进度'],
  ],
  completed: [
    ['checkCircle', 'green', '交付验收', '已完成', '会员注册与基础资料', '青禾 · 会员服务平台', 'v1 / D2 · 客户已验收', '查看已验收交付'],
    ['checkCircle', 'green', '交付验收', '已完成', '内容分类与标签管理', '未白 · 内容平台', 'v1 / D1 · 客户已验收', '查看已验收交付'],
  ],
};
function tasks() {
  if (role === 'client') return {
    mine: [ownerTasks.waiting[0], ownerTasks.waiting[1], ownerTasks.mine[1]].map((task) => {
      const copy = [...task]; copy[3] = copy[2] === '需求澄清' ? '项目协作' : '待你确认'; return copy;
    }),
    waiting: [[...ownerTasks.mine[0].slice(0,3), '等待供应方', ...ownerTasks.mine[0].slice(4)]],
    completed: ownerTasks.completed,
  };
  if (role === 'developer') return {
    mine: [ownerTasks.mine[1], ownerTasks.mine[2]],
    waiting: [[...ownerTasks.mine[0].slice(0,3), '等待负责人', ...ownerTasks.mine[0].slice(4)], ...ownerTasks.waiting],
    completed: ownerTasks.completed,
  };
  return ownerTasks;
}
function taskRows(bucket) {
  return tasks()[bucket].map(([symbol, tone, type, state, title, project, meta, action]) => `<article class="task"><span class="task-icon ${tone}">${icon(symbol)}</span><div class="task-main"><div class="task-top">${type}<span class="dot"></span>${state}</div><h3 class="task-title">${title}</h3><p class="task-meta">${project}<br>${meta}</p></div><a class="icon-button" href="${url('project')}" aria-label="${action}：${title}">${icon('arrow')}</a></article>`).join('');
}

function dashboard() {
  const t = tasks();
  const metrics = [['参与项目', '3', '当前可访问的项目', 'folder'], ['待我处理', t.mine.length, '当前项目角色可处理', 'checkCircle'], ['等待他人', t.waiting.length, '等待下一位参与者', 'clock'], ['已完成交付', t.completed.length, '客户已正式验收', 'box']];
  return shell(`<div class="page-heading"><div><div class="eyebrow">YOUR WORK, IN FOCUS</div><h1>工作概览</h1><p class="subtitle">${people[role][1]}，从这里看清进展，也找到下一步。</p></div>${role === 'owner' ? demo('新建项目', 'button primary', 'plus') : `<a class="button" href="${url('project')}">${icon('folder')}查看我的项目</a>`}</div>
    <section class="metric-strip" aria-label="示例业务统计">${metrics.map(([label, count, note, symbol], i) => `<div class="metric ${i === 1 ? 'highlight' : ''}"><div class="metric-label">${label}${icon(symbol)}</div><strong>${count.toString().padStart(2,'0')}</strong><small>${note}</small></div>`).join('')}</section>
    <div class="columns"><section class="panel"><div class="panel-header"><div><h2>下一步，处理这些</h2><p>与你在各项目中的角色和当前业务状态相关</p></div>${icon('checkCircle')}</div><div class="tabs" role="tablist" aria-label="待办分类">${[['mine','待我处理'],['waiting','等待他人'],['completed','已完成']].map(([key, label]) => `<button class="tab" id="tab-${key}" role="tab" aria-selected="${key === activeBucket}" aria-controls="task-panel" tabindex="${key === activeBucket ? '0' : '-1'}" data-bucket="${key}">${label}<span class="count">${t[key].length}</span></button>`).join('')}</div><div id="task-panel" role="tabpanel" aria-labelledby="tab-${activeBucket}" tabindex="0">${taskRows(activeBucket)}</div></section>
    <aside class="side-stack dashboard-side" aria-label="工作上下文"><section class="guide-panel">${icon('bridge')}<h2>确认的是同一份规格。</h2><p>每一次审批都绑定冻结版本。<br>查看范围、费用和工期后，再作决定。</p><ol class="steps"><li><span>1</span>整理需求，形成明确规格</li><li><span>2</span>供应方与客户依次确认</li><li><span>3</span>按已批准版本交付验收</li></ol></section><section class="panel"><div class="panel-header"><h2>${role === 'client' ? '你的项目访问' : '当前工作空间'}</h2></div><div class="panel-body workspace-details"><div class="kv"><span>${role === 'client' ? '访问方式' : '空间'}</span><span>${role === 'client' ? '项目独立授权' : '木序设计工作室'}</span></div><div class="kv"><span>查看范围</span><span>3 个获授权项目</span></div><div class="kv"><span>角色依据</span><span>每个项目分别确定</span></div></div></section></aside></div>
    <section class="panel section-gap"><div class="panel-header"><div><h2>我的项目</h2><p>每个项目，都有清晰的范围与确认记录</p></div>${demo('查看全部 ' + icon('arrow'), 'button link')}</div><div class="table-wrap"><table class="project-table"><caption class="sr-only">示例项目列表</caption><thead><tr><th scope="col">项目名称</th><th scope="col">你在此项目的角色</th><th scope="col">项目状态</th><th scope="col"><span class="sr-only">操作</span></th></tr></thead><tbody>${[['青','olive','青禾 · 会员服务平台','会员与积分业务'],['山','blue','山岚 · 预约系统','预约与服务流程'],['未','','未白 · 内容平台','内容管理与发布']].map(([initial, tone, name, note]) => `<tr><td><a href="${url('project')}" class="project-name"><span class="project-symbol ${tone}">${initial}</span><span><strong>${name}</strong><small>${note} · 设计示例</small></span></a></td><td>${roles[role]}</td><td>${badge('进行中', 'success')}</td><td><a class="table-link" href="${url('project')}">进入项目 →</a></td></tr>`).join('')}</tbody></table></div></section><div class="footer-note"><span>数字用于设计评审。正式数据将来自授权后的实时业务查询。</span><span>SPECIFICATIONS → AGREEMENT → DELIVERY</span></div>`);
}

function project() {
  const next = role === 'owner' ? ['待你确认供应方评估', '会员积分与订单抵扣 · 冻结 v2，已准备好供你审核。', '查看冻结版本'] : role === 'client' ? ['有一份变更，等待你的确认', '会员等级与成长值规则 · 冻结 v1，供应方已批准。', '查看并确认'] : ['先把问题说清，再形成新版本', '积分过期规则仍有问题未回答，可以继续补充澄清。', '查看澄清问题'];
  return shell(`<div class="page-heading project-heading"><div><div class="eyebrow">PROJECT OVERVIEW</div><h1>青禾 · 会员服务平台 ${badge('进行中','success')}</h1><p class="subtitle">你在此项目：${roles[role]} <span aria-hidden="true">·</span> 木序设计工作室</p></div><div class="heading-actions">${demo('复制链接','button','link')}${role === 'owner' ? demo('管理成员','button','users') : ''}</div></div>
    <nav class="project-tabs" aria-label="项目页面"><a class="tab" aria-current="page" href="${url('project')}">概览</a>${['需求','变更与审批','交付','活动记录'].map(label => `<a class="tab" href="#" data-notice>${label}</a>`).join('')}</nav>
    <section class="next-action" aria-label="项目下一步">${icon('checkCircle')}<div class="action-copy"><h2>${next[0]}</h2><p>${next[1]}</p><div class="workflow"><span class="${role === 'owner' ? 'current' : ''}">供应方确认</span>${icon('chevron')}<span class="${role === 'client' ? 'current' : ''}">客户确认</span>${icon('chevron')}<span>交付验收</span></div></div>${demo(next[2] + icon('arrow'),'button primary')}</section>
    <div class="columns"><div><section class="panel"><div class="panel-header"><div><h2>需求与范围</h2><p>查看已确定的规格，以及仍待澄清的问题</p></div>${demo('提出需求','button','plus')}</div><ul class="requirement-list">${[
      ['会员积分与订单抵扣','已就绪','success','r2','最新需求规格已就绪'],
      ['会员等级与成长值规则','已就绪','success','r1','最新需求规格已就绪'],
      ['积分过期与退款处理','澄清中','info','r1','需求仍在澄清中'],
      ['会员注册与基础资料','已就绪','success','r1','最新需求规格已就绪'],
    ].map(([title,status,tone,revision,note]) => `<li class="requirement-item">${icon('file')}<div class="requirement-copy"><a href="#" data-notice><strong>${title}</strong></a><small>${note}</small></div>${badge(status,tone)}<span class="revision">${revision}</span></li>`).join('')}</ul></section>
    <section class="panel section-gap"><div class="panel-header"><h2>初始范围</h2>${badge(icon('lock') + '只读参考')}</div><div class="panel-body"><p class="scope-copy">为青禾搭建会员服务平台，支持会员注册、资料管理、等级展示，以及基础运营管理。以清晰、易维护的流程连接客户与服务团队。</p><ul class="scope-list"><li>会员注册、登录及基础资料维护</li><li>会员等级展示与运营管理后台</li><li>响应式 Web 界面，适配桌面和移动设备</li></ul><div class="inline-note">${icon('shield')}<span>供应方录入的初始参考快照，不代表双方在平台签署的合同。<br>后续范围变化通过需求版本和正式变更确认。</span></div></div></section></div>
    <aside class="side-stack" aria-label="项目成员和活动"><section class="panel"><div class="panel-header"><h2>一起参与的人</h2>${icon('users')}</div><div class="panel-body"><div class="person"><span class="avatar">林</span><div class="person-info">林予安<small>Workspace Owner · 供应方审批</small></div></div><div class="person"><span class="avatar blue">陈</span><div class="person-info">陈序<small>Developer · 规格与交付</small></div></div><div class="person"><span class="avatar green">许</span><div class="person-info">许知禾<small>Client · 唯一客户审批人</small></div></div><div class="inline-note">${icon('lock')}<span>项目已正式提交变更，客户审批账号已锁定。</span></div></div></section>
    <section class="panel"><div class="panel-header"><h2>最近活动</h2>${demo('全部','button link')}</div><div class="panel-body"><ol class="timeline"><li><strong>陈序</strong> 提交了变更评估<br><a class="table-link" href="#" data-notice>会员积分与订单抵扣 · v2</a><time datetime="2026-11-10T06:20:00Z">11 月 10 日 14:20</time></li><li><strong>林予安</strong> 批准了供应方评估<br><a class="table-link" href="#" data-notice>会员等级与成长值规则 · v1</a><time datetime="2026-11-10T03:45:00Z">11 月 10 日 11:45</time></li><li><strong>许知禾</strong> 接受了交付<br><a class="table-link" href="#" data-notice>会员注册与基础资料 · v1 / D2</a><time datetime="2026-11-09T08:10:00Z">11 月 9 日 16:10</time></li></ol></div></section></aside></div><div class="footer-note"><span>设计示例 · 历史版本只读，所有正式决定均对应具体版本。</span><span>项目权限由服务端逐次校验</span></div>`);
}

function login() {
  return `${reviewBar()}<main class="login-layout" id="main" tabindex="-1"><section class="login-story" aria-label="产品介绍">${brand()}<div class="story-content"><div class="eyebrow">CLARITY BEFORE CODE</div><h1>把需求说清，<br>把每一次确认留住。</h1><p>从第一句想法，到最后一次验收。<br>让客户与开发团队，对齐每一步。</p><div class="bridge-card"><div class="bridge-title"><span>一份规格，贯穿整个交付。</span>${badge('版本可追溯','brand')}</div><div class="bridge-flow"><div class="bridge-stage"><span class="circle">${icon('message')}</span>澄清需求</div>${icon('arrow')}<div class="bridge-stage"><span class="circle">${icon('file')}</span>冻结规格</div>${icon('arrow')}<div class="bridge-stage"><span class="circle">${icon('checkCircle')}</span>双方确认</div>${icon('arrow')}<div class="bridge-stage"><span class="circle">${icon('box')}</span>交付验收</div></div></div></div><div class="story-footer">为独立开发者与小型软件团队而设计。</div></section>
    <section class="login-form-side" aria-label="登录表单设计"><div class="login-mobile-brand">${brand()}</div><div class="login-form"><div class="eyebrow">WELCOME TO SPECBRIDGE</div><h2>欢迎回来</h2><p class="intro">登录账号，继续你的项目协作。</p><form id="login-form"><div class="field"><label for="email">邮箱地址</label><input id="email" type="email" placeholder="you@example.com" autocomplete="off" aria-describedby="login-note"></div><div class="field"><label for="password">密码</label><div class="password-wrap"><input id="password" type="password" placeholder="输入你的密码" autocomplete="off" aria-describedby="login-note"><button class="icon-button" type="button" id="toggle-password" aria-label="显示密码" aria-pressed="false">${icon('eye')}</button></div></div><button class="button primary submit" type="submit">登录 ${icon('arrow')}</button></form><div class="login-register">还没有账号？<button data-notice>创建账号</button></div><div class="prototype-note" id="login-note">设计评审原型，不会发送登录请求。请勿输入真实账号或密码。</div><div class="login-trust">${icon('lock')}正式应用使用受保护的服务端会话</div></div></section></main>`;
}

function render() {
  document.title = `SpecBridge · ${page === 'login' ? '登录' : page === 'project' ? '项目概览' : '工作概览'} · 设计评审`;
  document.getElementById('app').innerHTML = page === 'login' ? login() : page === 'project' ? project() : dashboard();
  // The navigation above is generated only from fixed, local design fixtures.
  document.getElementById('mobile-nav-content').innerHTML = `<div class="drawer-heading">${brand()}<button class="icon-button" id="close-nav" aria-label="关闭导航">${icon('close')}</button></div>${navigation()}`;
}
render();
const tablet = window.matchMedia('(min-width: 768px) and (max-width: 1199px)');
function syncCompactSidebar() {
  document.body.classList.toggle('collapsed', tablet.matches);
  const control = document.getElementById('collapse');
  control?.setAttribute('aria-expanded', String(!tablet.matches));
  control?.setAttribute('aria-label', tablet.matches ? '展开侧栏' : '折叠侧栏');
}
syncCompactSidebar();
tablet.addEventListener('change', syncCompactSidebar);

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-notice], [data-bucket], #collapse, #open-nav, #close-nav, #toggle-password');
  if (!target) return;
  if (target.hasAttribute('data-notice')) {
    event.preventDefault();
    document.getElementById('notice').showModal();
  } else if (target.dataset.bucket) {
    activeBucket = target.dataset.bucket;
    document.querySelectorAll('[data-bucket]').forEach((tab) => {
      const selected = tab.dataset.bucket === activeBucket;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.getElementById('task-panel').innerHTML = taskRows(activeBucket);
    document.getElementById('task-panel').setAttribute('aria-labelledby', `tab-${activeBucket}`);
  } else if (target.id === 'collapse') {
    const collapsed = document.body.classList.toggle('collapsed');
    target.setAttribute('aria-expanded', String(!collapsed));
    target.setAttribute('aria-label', collapsed ? '展开侧栏' : '折叠侧栏');
  } else if (target.id === 'open-nav') {
    document.getElementById('mobile-nav').showModal();
  } else if (target.id === 'close-nav') {
    document.getElementById('mobile-nav').close();
  } else if (target.id === 'toggle-password') {
    const input = document.getElementById('password');
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    target.setAttribute('aria-label', visible ? '隐藏密码' : '显示密码');
    target.setAttribute('aria-pressed', String(visible));
  }
});
document.addEventListener('keydown', (event) => {
  // Explicit wrapping keeps keyboard navigation in the open review dialog,
  // including the last-to-first step that can otherwise reach browser chrome.
  const modal = document.querySelector('dialog[open]');
  if (modal && event.key === 'Tab') {
    const focusables = [...modal.querySelectorAll('a[href], button, input, select, [tabindex="0"]')];
    const first = focusables[0];
    const last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
    return;
  }
  if (!event.target.matches('[data-bucket]') || !['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const tabs = [...document.querySelectorAll('[data-bucket]')];
  const current = tabs.indexOf(event.target);
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  tabs[next].focus(); tabs[next].click();
});
document.addEventListener('change', (event) => {
  if (event.target.id === 'role') location.href = `?page=${page}&role=${event.target.value}`;
});
document.getElementById('login-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  document.getElementById('notice').showModal();
});
