// ─── DATA & INITIALIZATION ─────────────────────────────────
var API_URL = 'http://localhost:3000/api';

var students = [];
var att = {};
var tickets = [];
var role = 'teacher';
var currentUser = null;
var curTab = 0;
var curDate = todayStr();

var avatarColors = [
  ['#dbeafe','#1e40af'],['#d1fae5','#065f46'],['#fef3c7','#92400e'],
  ['#fce7f3','#9d174d'],['#ede9fe','#5b21b6'],['#ffedd5','#9a3412']
];

// Fetch initial data from backend
async function loadData() {
  try {
    const [stuRes, attRes, ticRes] = await Promise.all([
      fetch(`${API_URL}/students`),
      fetch(`${API_URL}/attendance`),
      fetch(`${API_URL}/tickets`)
    ]);
    students = await stuRes.json();
    att = await attRes.json();
    tickets = await ticRes.json();
  } catch (err) {
    showToast('Failed to load data from server');
    console.error(err);
  }
}

// ─── UTILS ──────────────────────────────────────────────────
function todayStr(){
  var d=new Date(); 
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function pad(n){return n<10?'0'+n:n}
function fmtDate(s){
  var p=s.split('-');
  var m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return p[2]+' '+m[p[1]-1]+' '+p[0];
}
function initials(n){return n.split(' ').map(function(w){return w[0]}).join('').toUpperCase().slice(0,2)}
function showToast(msg){
  var t=document.getElementById('toast');
  t.textContent=msg; t.style.opacity=1;
  setTimeout(function(){t.style.opacity=0},2000);
}

// ─── LOGIN LOGIC ───────────────────────────────────────────
function setRole(r){
  role=r;
  document.getElementById('rTeacher').classList.toggle('active',r==='teacher');
  document.getElementById('rStudent').classList.toggle('active',r==='student');
  
  var unameInput = document.getElementById('uname');
  unameInput.placeholder = r === 'teacher' ? 'Teacher username' : 'Roll number (e.g. 01)';
  unameInput.value = ''; 
}

function togglePassword() {
  var pwdInput = document.getElementById('upass');
  var toggleBtn = document.getElementById('togglePwd');
  
  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    toggleBtn.textContent = 'Hide';
  } else {
    pwdInput.type = 'password';
    toggleBtn.textContent = 'Show';
  }
}

async function doLogin(){
  var u=document.getElementById('uname').value.trim();
  var p=document.getElementById('upass').value.trim();
  document.getElementById('errMsg').textContent='';
  
  document.getElementById('loginBtn').disabled = true;
  document.getElementById('loginBtn').textContent = 'Loading...';
  
  await loadData(); // Load fresh data on login
  
  document.getElementById('loginBtn').disabled = false;
  document.getElementById('loginBtn').textContent = 'Sign In';

  if(role==='teacher'){
    if(u==='teacher'&&p==='teacher123'){
      currentUser={name:'Mr. Sharma'};
      showMain('teacher');
    } else {
      document.getElementById('errMsg').textContent='Invalid credentials';
    }
  } else {
    var s=students.find(function(x){return x.roll===u});
    if(s&&p==='student123'){
      currentUser=s;
      showMain('student');
    } else {
      document.getElementById('errMsg').textContent='Invalid roll number or password';
    }
  }
}

function doLogout(){
  currentUser=null;
  document.getElementById('mainBox').style.display='none';
  document.getElementById('loginBox').style.display='block';
  document.getElementById('uname').value='';
  document.getElementById('upass').value='';
}

function showMain(r){
  document.getElementById('loginBox').style.display='none';
  document.getElementById('mainBox').style.display='block';
  if(r==='teacher'){
    document.getElementById('roleBadge').textContent='Teacher';
    document.getElementById('roleBadge').className='rolePill teacherPill';
    document.getElementById('teacherArea').style.display='block';
    document.getElementById('studentArea').style.display='none';
    curTab=0;
    renderTab(0);
  } else {
    document.getElementById('roleBadge').textContent='Student';
    document.getElementById('roleBadge').className='rolePill studentPill';
    document.getElementById('teacherArea').style.display='none';
    document.getElementById('studentArea').style.display='block';
    renderStudentView();
  }
}

// ─── TABS & RENDERING ──────────────────────────────────────
function switchTab(i,btn){
  curTab=i;
  document.querySelectorAll('.tabBtn').forEach(function(b){b.classList.remove('active')});
  btn.classList.add('active');
  renderTab(i);
}

function renderTab(i){
  if(i===0) renderMark();
  else if(i===1) renderReports();
  else if(i===2) renderManage();
  else renderTicketsView(); 
}

function renderMark(){
  var day=att[curDate]||{};
  var html='<div class="card">';
  html+='<div class="dateRow"><div class="dateLabel">'+fmtDate(curDate)+'</div>';
  html+='<input type="date" id="dp" value="'+curDate+'" max="'+todayStr()+'" onchange="changeDate(this.value)"></div>';
  html+='<div style="font-size:12px;color:#888;margin-bottom:14px">'+students.length+' students</div>';
  
  for(var i=0;i<students.length;i++){
    var s=students[i];
    var v=day[s.id]||'';
    var c=avatarColors[i%6];
    html+='<div class="sRow">';
    html+='<div class="sLeft">';
    html+='<div class="avatar" style="background:'+c[0]+';color:'+c[1]+'">'+initials(s.name)+'</div>';
    html+='<div><div class="sName">'+s.name+'</div><div class="sRoll">Roll No. '+s.roll+'</div></div>';
    html+='</div>';
    html+='<div class="btnGroup">';
    html+='<button class="pBtn'+(v==='P'?' on':'')+'" onclick="mark(\''+s.id+'\',\'P\',this)">✓ Present</button>';
    html+='<button class="aBtn'+(v==='A'?' on':'')+'" onclick="mark(\''+s.id+'\',\'A\',this)">✗ Absent</button>';
    html+='</div></div>';
  }
  
  html+='<div class="saveRow"><button class="saveBtn" onclick="showToast(\'Attendance is saved automatically!\')">Save Attendance</button></div>';
  html+='</div>';
  document.getElementById('tabContent').innerHTML=html;
}

async function mark(sid, val, clickedBtn){
  // Optimistic UI update
  if(!att[curDate]) att[curDate]={};
  att[curDate][sid]=val;
  
  var group=clickedBtn.parentNode;
  var btns=group.querySelectorAll('button');
  btns[0].classList.toggle('on', val==='P');
  btns[1].classList.toggle('on', val==='A');

  // Backend update
  try {
    await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: curDate, studentId: sid, status: val })
    });
  } catch(err) {
    showToast('Error saving attendance');
  }
}

function changeDate(v){
  curDate=v;
  renderMark();
}

function renderReports(){
  var dates=Object.keys(att).sort().reverse();
  var total=dates.length;
  var allP=0;
  students.forEach(function(s){
    dates.forEach(function(d){if(att[d][s.id]==='P')allP++});
  });
  var avg=total&&students.length?Math.round(allP/(students.length*total)*100):0;

  var html='<div class="statGrid">';
  html+='<div class="statBox"><div class="statN">'+total+'</div><div class="statL">days recorded</div></div>';
  html+='<div class="statBox"><div class="statN">'+students.length+'</div><div class="statL">students</div></div>';
  html+='<div class="statBox"><div class="statN">'+avg+'%</div><div class="statL">avg attendance</div></div>';
  html+='</div>';

  html+='<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:12px">Student Summary</div>';
  html+='<div class="rHead"><div>Name</div><div style="text-align:center">Present</div><div style="text-align:center">Absent</div><div style="text-align:center">%</div></div>';
  students.forEach(function(s){
    var p=dates.filter(function(d){return att[d]&&att[d][s.id]==='P'}).length;
    var a=dates.filter(function(d){return att[d]&&att[d][s.id]==='A'}).length;
    var pct=p+a>0?Math.round(p/(p+a)*100):'-';
    var col=typeof pct==='number'?(pct<75?'#dc2626':'#16a34a'):'#888';
    html+='<div class="rRow"><div style="font-weight:500">'+s.name+'</div>';
    html+='<div style="text-align:center"><span class="tag tagP">'+p+'</span></div>';
    html+='<div style="text-align:center"><span class="tag tagA">'+a+'</span></div>';
    html+='<div style="text-align:center;font-weight:700;color:'+col+'">'+pct+(typeof pct==='number'?'%':'')+'</div></div>';
  });
  html+='</div>';
  document.getElementById('tabContent').innerHTML=html;
}

function renderManage(){
  var html='<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:12px">Students ('+students.length+')</div>';
  students.forEach(function(s){
    html+='<div class="mRow">';
    html+='<div style="display:flex;align-items:center;gap:10px">';
    html+='<span style="font-size:13px;color:#888;min-width:50px">Roll '+s.roll+'</span>';
    html+='<span style="font-size:14px;font-weight:500">'+s.name+'</span></div>';
    html+='<button class="delBtn" onclick="delStudent(\''+s.id+'\')">Remove</button>';
    html+='</div>';
  });
  html+='<div class="addRow">';
  html+='<input id="nRoll" type="text" placeholder="Roll No." style="max-width:90px">';
  html+='<input id="nName" type="text" placeholder="Student name">';
  html+='<button class="addBtn" onclick="addStudent()">+ Add</button>';
  html+='</div></div>';
  document.getElementById('tabContent').innerHTML=html;
}

async function delStudent(id){
  if(!confirm('Remove student?')) return;
  
  // Optimistic UI
  students=students.filter(function(s){return s.id!==id});
  renderManage();
  
  try {
    await fetch(`${API_URL}/students/${id}`, { method: 'DELETE' });
    showToast('Student removed');
  } catch(err) {
    showToast('Error removing student');
  }
}

async function addStudent(){
  var r=document.getElementById('nRoll').value.trim();
  var n=document.getElementById('nName').value.trim();
  if(!r||!n){showToast('Fill in both fields');return;}
  if(students.find(function(s){return s.roll===r})){showToast('Roll number exists');return;}
  
  try {
    const res = await fetch(`${API_URL}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: n, roll: r })
    });
    if(!res.ok) throw new Error('Failed to add');
    const newStudent = await res.json();
    students.push(newStudent);
    renderManage();
    showToast('Student added');
  } catch(err) {
    showToast('Error adding student');
  }
}

// ─── TICKET LOGIC (TEACHER) ────────────────────────────────
function renderTicketsView(){
  var html='<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:12px">Pending Disputes</div>';
  var pending = tickets.filter(function(t){return t.status==='Pending'});
  
  if(pending.length===0){
    html+='<div class="empty">No pending tickets.</div>';
  } else {
    pending.forEach(function(t){
      var stu = students.find(function(s){return s.id===t.studentId});
      if(!stu) return; // safeguard
      html+='<div class="ticketRow">';
      html+='<div><div style="font-weight:600;font-size:14px">'+stu.name+' (Roll '+stu.roll+')</div>';
      html+='<div style="font-size:12px;color:#666">Date: '+fmtDate(t.date)+'</div>';
      html+='<div style="font-size:13px;margin-top:6px;font-style:italic">"'+t.reason+'"</div></div>';
      html+='<div style="display:flex;gap:6px;flex-direction:column">';
      html+='<button class="approveBtn" onclick="resolveTicket(\''+t.id+'\',true,\''+t.date+'\',\''+t.studentId+'\')">Approve</button>';
      html+='<button class="rejectBtn" onclick="resolveTicket(\''+t.id+'\',false)">Reject</button>';
      html+='</div></div>';
    });
  }
  html+='</div>';
  document.getElementById('tabContent').innerHTML=html;
}

async function resolveTicket(tid, isApproved, date, sid){
  var t = tickets.find(function(x){return x.id===tid});
  if(t){
    var newStatus = isApproved ? 'Approved' : 'Rejected';
    t.status = newStatus;
    
    if(isApproved){
      if(!att[date]) att[date] = {};
      att[date][sid] = 'P';
    }
    
    renderTicketsView();
    showToast(isApproved ? 'Marked as Present' : 'Ticket Rejected');
    
    try {
      await fetch(`${API_URL}/tickets/${tid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, date, studentId: sid })
      });
    } catch(err) {
      showToast('Error updating ticket');
    }
  }
}

// ─── STUDENT VIEW ──────────────────────────────────────────
function renderStudentView(){
  var sid=currentUser.id;
  var dates=Object.keys(att).sort().reverse();
  var p=dates.filter(function(d){return att[d]&&att[d][sid]==='P'}).length;
  var a=dates.filter(function(d){return att[d]&&att[d][sid]==='A'}).length;
  var pct=p+a>0?Math.round(p/(p+a)*100):0;
  var col=pct<75?'#dc2626':'#16a34a';

  var html='<div style="font-size:14px;color:#666;margin-bottom:14px">'+currentUser.name+' — Roll No. '+currentUser.roll+'</div>';
  html+='<div class="statGrid">';
  html+='<div class="statBox"><div class="statN" style="color:#16a34a">'+p+'</div><div class="statL">present</div></div>';
  html+='<div class="statBox"><div class="statN" style="color:#dc2626">'+a+'</div><div class="statL">absent</div></div>';
  html+='<div class="statBox"><div class="statN" style="color:'+col+'">'+pct+'%</div><div class="statL">attendance</div></div>';
  html+='</div>';
  
  html+='<div class="card"><div style="font-size:15px;font-weight:600;margin-bottom:12px">My Attendance Record</div>';
  var found=false;
  
  dates.forEach(function(d){
    var v=att[d]&&att[d][sid];
    if(!v) return;
    found=true;
    
    // Ticket Check Logic
    var myTicket = tickets.find(function(t){return t.studentId===sid && t.date===d});
    var ticketUI = '';
    
    if(v==='A'){
      if(myTicket){
        var statusColor = myTicket.status === 'Pending' ? '#f59e0b' : (myTicket.status === 'Rejected' ? '#dc2626' : '#16a34a');
        ticketUI = '<span style="font-size:11px; font-weight:600; color:'+statusColor+'">'+myTicket.status+'</span>';
      } else {
        ticketUI = '<button class="disputeBtn" onclick="raiseTicket(\''+d+'\')">Dispute</button>';
      }
    }
    
    html+='<div class="myRow"><div style="font-weight:500">'+fmtDate(d)+'</div>';
    html+='<div style="display:flex;align-items:center;gap:12px">'+ticketUI+'<span class="tag '+(v==='P'?'tagP':'tagA')+'">'+(v==='P'?'Present':'Absent')+'</span></div></div>';
  });
  if(!found) html+='<div class="empty">No records found.</div>';
  html+='</div>';
  document.getElementById('studentContent').innerHTML=html;
}

async function raiseTicket(d){
  var reason = prompt("Why are you disputing this absence?");
  if(!reason) return;
  
  try {
    const res = await fetch(`${API_URL}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: currentUser.id, date: d, reason: reason })
    });
    const newTicket = await res.json();
    tickets.push(newTicket);
    renderStudentView();
    showToast('Ticket submitted to teacher.');
  } catch(err) {
    showToast('Error submitting ticket');
  }
}
