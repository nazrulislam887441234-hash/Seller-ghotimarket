import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const app = initializeApp({ apiKey: "AIzaSyBUhNhYvuo_FTvZ5RZR6Gn-4hsUY21S0XE", authDomain: "ghotimarket.firebaseapp.com", projectId: "ghotimarket" });
const db = getFirestore(app); 
const auth = getAuth(app);
const IMGBB_KEY = "e1da51b6d309ac3a5a235b5088ebc334";

// ===== Firebase Error Handler (বাংলা মেসেজ) =====
function getFirebaseErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/network-request-failed':
      return "নেটওয়ার্ক কানেকশন সমস্যা। ইন্টারনেট কানেকশন চেক করুন।";
    case 'auth/too-many-requests':
      return "অতিরিক্ত চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
    case 'auth/user-token-expired':
      return "আপনার সেশনের মেয়াদ শেষ হয়ে গেছে। দয়া করে আবার লগইন করুন।";
    case 'auth/user-disabled':
      return "এই অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে।";
    case 'auth/internal-error':
      return "সার্ভারে অভ্যন্তরীণ সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।";
    case 'auth/invalid-email':
      return "ইমেইল ঠিকানাটি সঠিক নয়।";
    case 'auth/email-already-in-use':
      return "এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট রয়েছে।";
    case 'auth/weak-password':
      return "পাসওয়ার্ডটি খুব দুর্বল। অন্তত ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।";
    default:
      return "একটি ত্রুটি ঘটেছে। আবার চেষ্টা করুন।";
  }
}

// ===== Custom Popup Function (কোনো Browser Alert ব্যবহার করা হয়নি) =====
function showPopup(msg, type = 'error') {
  const popupContainer = document.getElementById('customPopup');
  if (!popupContainer) return;
  
  popupContainer.innerHTML = `
    <div class="popup-box">
      <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
      <p>${msg}</p>
      <button onclick="document.getElementById('customPopup').style.display='none'">ঠিক আছে</button>
    </div>
  `;
  popupContainer.style.display = 'flex';
}

// ===== Canvas & Image Processing =====
function processCanvas(img, targetRatio) { 
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const currentRatio = img.width / img.height;
  const tolerance = 0.05;
  if (Math.abs(currentRatio - targetRatio) < tolerance) {
    if (targetRatio === 1) { canvas.width = canvas.height = 1200; }
    else { canvas.width = 1600; canvas.height = 900; }
    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
  } else {
    if (targetRatio === 1) { 
      canvas.width = canvas.height = 1200; 
      const size = Math.min(img.width, img.height); 
      const sx = (img.width - size) / 2; 
      const sy = (img.height - size) / 2; 
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 1200, 1200); 
    } else { 
      canvas.width = 1600; 
      canvas.height = 900; 
      const targetH = img.width / (16 / 9); 
      let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height; 
      if (img.height > targetH) { 
        sy = (img.height - targetH) / 2; 
        sHeight = targetH; 
      } else { 
        const targetW = img.height * (16 / 9); 
        sx = (img.width - targetW) / 2; 
        sWidth = targetW; 
      } 
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 1600, 900); 
    }
  }
  return canvas;
}

async function handleImage(file, targetRatio, previewId) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = processCanvas(img, targetRatio);
      const previewEl = document.getElementById(previewId);
      if (previewEl) {
        previewEl.src = canvas.toDataURL('image/webp', 0.85);
        previewEl.style.display = 'block';
      }
      canvas.toBlob(async (blob) => {
        const fd = new FormData(); 
        fd.append("image", blob);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) resolve(data.data.url); 
        else reject("ImgBB Upload Failed");
      }, 'image/webp', 0.85);
    }
    img.onerror = () => reject("ছবি লোড হয়নি");
  });
}

async function checkUsername(username) {
  const q = query(collection(db, "users"), where("usernameLower", "==", username.toLowerCase()));
  const snap = await getDocs(q);
  return snap.empty;
}

// Inputs Event Listeners
const shopNameEl = document.getElementById('shopName');
if (shopNameEl) {
  shopNameEl.addEventListener('input', e => {
    const usernameEl = document.getElementById('username');
    if (usernameEl) {
      usernameEl.value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
  });
}

const shopLogoEl = document.getElementById('shopLogo');
if (shopLogoEl) {
  shopLogoEl.addEventListener('change', e => { if (e.target.files[0]) handleImage(e.target.files[0], 1, 'logoPreview'); });
}

const shopBannerEl = document.getElementById('shopBanner');
if (shopBannerEl) {
  shopBannerEl.addEventListener('change', e => { if (e.target.files[0]) handleImage(e.target.files[0], 16 / 9, 'bannerPreview'); });
}

// ===== Session Management & Page Load Recovery (Requirement 6 & 7) =====
let activeUser = null;

function fetchActiveUser() {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
    } else {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    }
  });
}

// Page Load-এ চেক করা ইউজার ইতিমধ্যে ভেরিফিকেশন স্টেজে আছে কিনা
document.addEventListener("DOMContentLoaded", async () => {
  const user = await fetchActiveUser();
  if (user) {
    activeUser = user;
    // যদি ইউজার অলরেডি ফর্ম সাবমিট করে থাকে কিন্তু পেজ রিফ্রেশ হয়
    const step1 = JSON.parse(localStorage.getItem('seller_signup_step1'));
    if (!step1 && !user.emailVerified) {
      const shopForm = document.getElementById('shopForm');
      const verificationBox = document.getElementById('verificationBox');
      const userEmail = document.getElementById('userEmail');
      
      if (shopForm) shopForm.style.display = 'none';
      if (verificationBox) verificationBox.style.display = 'block';
      if (userEmail) userEmail.innerText = user.email || '';
    }
  }
});

// ===== Form Submission Handler =====
const shopFormEl = document.getElementById('shopForm');
if (shopFormEl) {
  shopFormEl.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> তৈরি হচ্ছে...';
    btn.disabled = true;
    
    try {
      const step1 = JSON.parse(localStorage.getItem('seller_signup_step1'));
      if (!step1) throw new Error("আগের ধাপ পূরণ করুন");

      const shopName = document.getElementById('shopName').value;
      const username = document.getElementById('username').value;
      const shopLogo = document.getElementById('shopLogo').files[0];
      const shopBanner = document.getElementById('shopBanner').files[0];

      if (!shopLogo || !shopBanner) throw new Error("লোগো এবং ব্যানার সিলেক্ট করুন");

      const isAvailable = await checkUsername(username);
      if (!isAvailable) {
        const msgEl = document.getElementById('usernameMsg');
        if (msgEl) {
          msgEl.innerText = `এই ইউজার নেইম অন্য কেউ ব্যবহার করেছে। সাজেশন: ${username}123, ${username}_24`;
          msgEl.style.color = 'red';
        }
        throw new Error("Username নেওয়া আছে");
      }

      const [shopLogoUrl, shopBannerUrl] = await Promise.all([
        handleImage(shopLogo, 1, 'logoPreview'), 
        handleImage(shopBanner, 16 / 9, 'bannerPreview')
      ]);

      const userCredential = await createUserWithEmailAndPassword(auth, step1.email, step1.password);
      activeUser = userCredential.user;
      const uid = activeUser.uid;

      await setDoc(doc(db, "users", uid), {
        fullName: step1.fullName, email: step1.email, whatsapp: step1.whatsapp,
        nidFront: step1.nidFrontUrl, nidBack: step1.nidBackUrl,
        shopName, username, usernameLower: username.toLowerCase(),
        shopLogo: shopLogoUrl, shopBanner: shopBannerUrl,
        active: false, verified: false, createdAt: serverTimestamp(),
        usernameCreatedAt: serverTimestamp(), todayUploads: 0, lastUploadDate: 0, profileUnlockedUntil: 0
      });

      await sendEmailVerification(activeUser);
      localStorage.removeItem('seller_signup_step1');

      document.getElementById('shopForm').style.display = 'none';
      document.getElementById('verificationBox').style.display = 'block';
      document.getElementById('userEmail').innerText = step1.email;
      showPopup("অ্যাকাউন্ট তৈরি হয়েছে! ইমেইল চেক করুন", "success");

    } catch (err) {
      const friendlyMsg = err.code ? getFirebaseErrorMessage(err.code) : err.message;
      showPopup(friendlyMsg);
      btn.innerHTML = 'অ্যাকাউন্ট তৈরি করুন <i class="fas fa-check"></i>';
      btn.disabled = false;
    }
  });
}

// ===== ভেরিফিকেশন চেক বাটন (Production Ready with Timeout & Fresh User) =====
const checkBtn = document.getElementById('checkBtn');
if (checkBtn) {
  checkBtn.onclick = async () => {
    // Session Recovery (Requirement 6 & 7)
    if (!activeUser) {
      activeUser = await fetchActiveUser();
    }
    
    if (!activeUser) {
      showPopup("সেশন পাওয়া যায়নি। অনুগ্রহ করে আবার লগইন করুন।");
      window.location.href = 'login.html';
      return;
    }

    const originalBtnHTML = checkBtn.innerHTML;
    checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> চেক করা হচ্ছে...';
    checkBtn.disabled = true;

    // Timeout Protection (10 Seconds Limit - Requirement 2)
    let isTimeout = false;
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        isTimeout = true;
        reject(new Error("TIMEOUT"));
      }, 10000);
    });

    try {
      const verificationCheckTask = async () => {
        // Fresh User Reload (Requirement 1)
        await activeUser.reload();
        
        // Fresh Auth Read
        const freshUser = auth.currentUser;
        if (!freshUser) throw new Error("User session lost");

        if (freshUser.emailVerified) {
          // Firestore Update (Requirement 4)
          await setDoc(doc(db, "users", freshUser.uid), { 
            verified: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
          
          window.location.href = 'notice.html';
        } else {
          // Not Verified Yet (Requirement 5)
          showPopup("আপনার ইমেইল এখনও ভেরিফাই হয়নি। Inbox এবং Spam Folder চেক করুন।", "error");
          checkBtn.innerHTML = originalBtnHTML;
          checkBtn.disabled = false;
        }
      };

      // Race between network execution and 10s timeout
      await Promise.race([verificationCheckTask(), timeoutPromise]);

    } catch (err) {
      checkBtn.innerHTML = originalBtnHTML;
      checkBtn.disabled = false;

      if (isTimeout || err.message === "TIMEOUT") {
        showPopup("সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। আবার চেষ্টা করুন।");
      } else {
        const errorMsg = err.code ? getFirebaseErrorMessage(err.code) : err.message;
        showPopup(errorMsg);
      }
    }
  };
}

// ===== Resend Email Button =====
const resendBtn = document.getElementById('resendBtn');
if (resendBtn) {
  resendBtn.onclick = async () => {
    if (!activeUser) {
      activeUser = await fetchActiveUser();
    }
    if (!activeUser) {
      return showPopup("সেশন শেষ। পেজ রিফ্রেশ করুন।");
    }
    
    resendBtn.disabled = true;
    try {
      await sendEmailVerification(activeUser);
      showPopup("আবার মেইল পাঠানো হয়েছে। Spam ফোল্ডার চেক করুন।", "success");
      setTimeout(() => { resendBtn.disabled = false; }, 60000);
    } catch (err) {
      resendBtn.disabled = false;
      showPopup(getFirebaseErrorMessage(err.code));
    }
  };
}
