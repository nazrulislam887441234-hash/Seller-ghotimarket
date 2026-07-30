import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
const app = initializeApp({apiKey:"AIzaSyBUhNhYvuo_FTvZ5RZR6Gn-4hsUY21S0XE",authDomain:"ghotimarket.firebaseapp.com",projectId:"ghotimarket"});
const IMGBB_KEY = "e1da51b6d309ac3a5a235b5088ebc334";

function showPopup(msg,type='error'){
  document.getElementById('customPopup').innerHTML = `<div class="popup-box"><i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i><p>${msg}</p><button onclick="this.parentElement.parentElement.style.display='none'">ঠিক আছে</button></div>`;
  document.getElementById('customPopup').style.display='flex';
}

// ===== PREVIEW + UPLOAD =====
async function handleImage(file, previewId){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async ()=>{
// 1. Preview দেখাও - Aspect Ratio ঠিক রেখে
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

const maxWidth = 1200;

let width = img.width;
let height = img.height;

if (width > maxWidth) {
    const scale = maxWidth / width;
    width = maxWidth;
    height = height * scale;
}

canvas.width = width;
canvas.height = height;

ctx.drawImage(img, 0, 0, width, height);

      document.getElementById(previewId).src = canvas.toDataURL('image/webp', 0.85);
      document.getElementById(previewId).style.display = 'block';

      // 2. Upload এর জন্য blob
      canvas.toBlob(async (blob)=>{
        const fd = new FormData();
        fd.append("image", blob);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`,{method:"POST",body:fd});
        const data = await res.json();
        if(data.success) resolve(data.data.url); else reject("ImgBB Upload Failed");
      },'image/webp',0.85);
    }
    img.onerror = ()=>reject("ছবি লোড হয়নি");
  })
}

// ছবি সিলেক্ট করার সাথে preview
document.getElementById('nidFront').addEventListener('change', e=>{
  if(e.target.files[0]) handleImage(e.target.files[0], 'nidFrontPreview');
})
document.getElementById('nidBack').addEventListener('change', e=>{
  if(e.target.files[0]) handleImage(e.target.files[0], 'nidBackPreview');
})

document.getElementById('signupForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const btn = document.getElementById('nextBtn');
  btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> আপলোড হচ্ছে...';
  btn.disabled=true;
  try{
    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const whatsapp = document.getElementById('whatsapp').value.trim();
    const password = document.getElementById('password').value;
    const nidFront = document.getElementById('nidFront').files[0];
    const nidBack = document.getElementById('nidBack').files[0];

    if(!nidFront ||!nidBack) throw new Error("NID এর ২টা ছবিই দিন");

    // Submit এর সময় আবার upload করবে, কারণ preview তে blob হারিয়ে যায়
    const [nidFrontUrl, nidBackUrl] = await Promise.all([
      handleImage(nidFront, 'nidFrontPreview'),
      handleImage(nidBack, 'nidBackPreview')
    ]);

    const step1Data = {fullName,email,whatsapp,password,nidFrontUrl,nidBackUrl};
    localStorage.setItem('seller_signup_step1', JSON.stringify(step1Data));
    localStorage.setItem('pending_email', email);

    window.location.href = 'shops.html';
  }catch(err){
    showPopup(err.message);
    btn.innerHTML='পরবর্তী <i class="fas fa-arrow-right"></i>';
    btn.disabled=false;
  }
});
