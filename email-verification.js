import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp({apiKey:"AIzaSyBUhNhYvuo_FTvZ5RZR6Gn-4hsUY21S0XE",authDomain:"ghotimarket.firebaseapp.com",projectId:"ghotimarket"});
const auth = getAuth(app);
const emailEl = document.getElementById('userEmail');

function showPopup(msg,type='error'){
  document.getElementById('customPopup').innerHTML = `<div class="popup-box"><i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i><p>${msg}</p><button onclick="this.parentElement.parentElement.style.display='none'">ঠিক আছে</button></div>`;
  document.getElementById('customPopup').style.display='flex';
}

// 1. পেজ লোড হওয়ার সাথে সাথেই localStorage থেকে দেখাও
const savedEmail = localStorage.getItem('pending_email');
if(savedEmail){
  emailEl.innerText = savedEmail;
  emailEl.style.color = '#00a651';
}else{
  emailEl.innerText = 'ইমেইল পাওয়া যায়নি';
  emailEl.style.color = 'red';
}

// 2. Firebase চেক - ভেরিফাই হলে notice এ পাঠাবে
onAuthStateChanged(auth, (user) => {
  if(user){
    emailEl.innerText = user.email;
    if(user.emailVerified){
      localStorage.removeItem('pending_email'); 
      window.location.href = 'notice.html';
    }
  }
})

document.getElementById('checkBtn').onclick = async ()=>{
  const user = auth.currentUser;
  if(!user) return showPopup("Session শেষ। আবার লগিন করুন");
  
  document.getElementById('checkBtn').innerHTML = '<i class="fas fa-spinner fa-spin"></i> চেক করা হচ্ছে...';
  document.getElementById('checkBtn').disabled = true;
  await user.reload();
  if(user.emailVerified){ 
    localStorage.removeItem('pending_email');
    window.location.href='notice.html'; 
  }else{ 
    showPopup("ইমেইলটা এখনো ভেরিফাই হয়নি। মেইলের লিংকে ক্লিক করুন"); 
    document.getElementById('checkBtn').innerHTML = '<i class="fas fa-sync"></i> আমি ভেরিফাই করেছি';
    document.getElementById('checkBtn').disabled = false;
  }
}

document.getElementById('resendBtn').onclick = async ()=>{ 
  const user = auth.currentUser;
  if(!user) return showPopup("Session শেষ। আবার লগিন করুন");

  document.getElementById('resendBtn').disabled = true;
  await sendEmailVerification(user); 
  showPopup("আবার মেইল পাঠানো হয়েছে। Spam ফোল্ডার চেক করুন","success"); 
  setTimeout(()=>{document.getElementById('resendBtn').disabled = false;}, 60000);
}
