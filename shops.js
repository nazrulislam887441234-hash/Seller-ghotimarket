import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp({apiKey:"AIzaSyBUhNhYvuo_FTvZ5RZR6Gn-4hsUY21S0XE",authDomain:"ghotimarket.firebaseapp.com",projectId:"ghotimarket"});
const db = getFirestore(app); const auth = getAuth(app);
const IMGBB_KEY = "e1da51b6d309ac3a5a235b5088ebc334";

// ===== SMART CROP FUNCTION =====
function processCanvas(img, targetRatio){
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const currentRatio = img.width / img.height;
  const tolerance = 0.05;

  if(Math.abs(currentRatio - targetRatio) < tolerance){
    // Ratio ঠিক আছে, শুধু resize
    if(targetRatio === 1){ canvas.width = canvas.height = 1200; }
    else{ canvas.width = 1600; canvas.height = 900; }
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
  }else{
    // Ratio ঠিক নাই, crop করো
    if(targetRatio === 1){ // 1:1 Logo
      canvas.width = canvas.height = 1200;
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 1200, 1200);
    }else{ // 16:9 Banner
      canvas.width = 1600; canvas.height = 900;
      const targetH = img.width / (16/9);
      let sx=0, sy=0, sWidth=img.width, sHeight=img.height;
      if(img.height > targetH){
        sy = (img.height - targetH) / 2;
        sHeight = targetH;
      }else{
        const targetW = img.height * (16/9);
        sx = (img.width - targetW) / 2;
        sWidth = targetW;
      }
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1600, 900);
    }
  }
  return canvas;
}

// ===== PREVIEW + UPLOAD =====
async function handleImage(file, targetRatio, previewId){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async ()=>{
      const canvas = processCanvas(img, targetRatio);
      
      // 1. Preview দেখাও - crop করা canvas
      document.getElementById(previewId).src = canvas.toDataURL('image/webp', 0.85);
      document.getElementById(previewId).style.display = 'block';

      // 2. Upload এর জন্য blob বানাও
      canvas.toBlob(async (blob)=>{
        const fd = new FormData(); fd.append("image", blob);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:"POST",body:fd});
        const data = await res.json();
        if(data.success) resolve(data.data.url); else reject("ImgBB Upload Failed");
      },'image/webp',0.85);
    }
    img.onerror = ()=>reject("ছবি লোড হয়নি");
  })
}

async function checkUsername(username){
  const q = query(collection(db,"users"), where("usernameLower","==",username.toLowerCase()));
  const snap = await getDocs(q);
  return snap.empty;
}

function showPopup(msg,type='error'){
  document.getElementById('customPopup').innerHTML = `<div class="popup-box"><i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i><p>${msg}</p><button onclick="this.parentElement.parentElement.style.display='none'">ঠিক আছে</button></div>`;
  document.getElementById('customPopup').style.display='flex';
}

document.getElementById('shopName').addEventListener('input',e=>{
  document.getElementById('username').value = e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
})

document.getElementById('shopLogo').addEventListener('change', e=>{
  if(e.target.files[0]) handleImage(e.target.files[0], 1, 'logoPreview');
})
document.getElementById('shopBanner').addEventListener('change', e=>{
  if(e.target.files[0]) handleImage(e.target.files[0], 16/9, 'bannerPreview');
})

document.getElementById('shopForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> তৈরি হচ্ছে...';
  btn.disabled=true;
  try{
    const step1 = JSON.parse(localStorage.getItem('seller_signup_step1'));
    if(!step1) throw new Error("আগের ধাপ পূরণ করুন");

    const shopName = document.getElementById('shopName').value;
    const username = document.getElementById('username').value;
    const shopLogo = document.getElementById('shopLogo').files[0];
    const shopBanner = document.getElementById('shopBanner').files[0];

    if(!shopLogo ||!shopBanner) throw new Error("লোগো এবং ব্যানার সিলেক্ট করুন");

    const isAvailable = await checkUsername(username);
    if(!isAvailable){
      document.getElementById('usernameMsg').innerText = `এই ইউজার নেইম অন্য কেউ ব্যাবহার করেছে. সাজেশন: ${username}123, ${username}_24, ${username}BD`;
      document.getElementById('usernameMsg').style.color='red';
      throw new Error("Username নেওয়া আছে");
    }

    // Submit এর সময় আবার upload করবে
    const [shopLogoUrl, shopBannerUrl] = await Promise.all([
      handleImage(shopLogo,1,'logoPreview'), 
      handleImage(shopBanner,16/9,'bannerPreview')
    ]);

    const userCredential = await createUserWithEmailAndPassword(auth, step1.email, step1.password);
    const uid = userCredential.user.uid;

    await setDoc(doc(db,"users",uid),{
      fullName: step1.fullName,
      email: step1.email,
      whatsapp: step1.whatsapp,
      nidFront: step1.nidFrontUrl,
      nidBack: step1.nidBackUrl,
      shopName, username, usernameLower: username.toLowerCase(),
      shopLogo: shopLogoUrl, shopBanner: shopBannerUrl,
      active: false, verified: false, createdAt: serverTimestamp(),
      usernameCreatedAt: serverTimestamp(), todayUploads:0, lastUploadDate:0, profileUnlockedUntil:0
    });

    await sendEmailVerification(userCredential.user);

    // localStorage.clear(); // <-- এটা ভুল। এটা করবা না
    localStorage.removeItem('seller_signup_step1'); // শুধু এটা ডিলিট করো

    window.location.href = 'email-verification.html';

  }catch(err){
    showPopup(err.message);
    btn.innerHTML='অ্যাকাউন্ট তৈরি করুন <i class="fas fa-check"></i>';
    btn.disabled=false;
  }
});
