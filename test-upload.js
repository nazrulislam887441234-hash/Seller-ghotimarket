/* ==========================================================
   Upload Product Logic - Firebase v10 Modular SDK
   ========================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc, getDocs, collection, addDoc, runTransaction, updateDoc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Firebase Initialization
const firebaseConfig = {
    apiKey: "AIzaSyBUhNhYvuo_FTvZ5RZR6Gn-4hsUY21S0XE",
    projectId: "ghotimarket"
};
const db = getFirestore(initializeApp(firebaseConfig));
const auth = getAuth();

let keywords = [];
let userData = null;

// Load Active Upload APIs from Firestore api_keys collection (Name only, no caching of apiKeys)
async function loadActiveUploadApis() {
    const apiSelector = document.getElementById('apiSelector');
    const loadingText = document.getElementById('api-loading-text');
    const upBtn = document.getElementById('upBtn');

    try {
        apiSelector.innerHTML = '<option value="">Select Upload API</option>';

        // Query active keys sorted by name ascending
        const q = query(
            collection(db, "api_keys"), 
            where("status", "==", "active"), 
            orderBy("name", "asc")
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            apiSelector.disabled = true;
            upBtn.disabled = true;
            if (loadingText) loadingText.textContent = "No active upload API available.";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const option = document.createElement('option');
            option.value = docSnap.id; // Document ID as value
            option.textContent = data.name; // Display only name
            apiSelector.appendChild(option);
        });

        apiSelector.disabled = false;
        upBtn.disabled = false;
        if (loadingText) loadingText.textContent = "";

    } catch (error) {
        console.error("Error loading upload APIs:", error);
        if (loadingText) loadingText.textContent = "Failed to load upload APIs.";
        upBtn.disabled = true;
    }
}

// Load Categories from Firestore
async function loadCategories() {
    const catSelect = document.getElementById('pCategory');
    try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const option = document.createElement('option');
            option.value = data.slug;
            option.textContent = data.categoryName;
            catSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Authentication Guard & Initialization
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            userData = userSnap.data();
            if (!userData || userData.profileUnlockedUntil < Date.now()) {
                window.location.href = "locked.html";
            } else {
                document.getElementById('lock-screen').style.display = 'none';
                await loadCategories();
                await loadActiveUploadApis();
            }
        } catch (err) {
            console.error("Auth check error:", err);
            window.location.href = "login.html";
        }
    } else {
        window.location.href = "login.html";
    }
});

// Image Preview Utility
window.previewImg = (input, viewId, boxId) => {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const viewElement = document.getElementById(viewId);
            viewElement.src = e.target.result;
            viewElement.style.display = 'block';
            document.getElementById(boxId).style.border = 'none';
        };
        reader.readAsDataURL(file);
    }
};

// WebP Conversion & Watermark Utility
const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let cropX = 0;
                let cropY = 0;
                let cropSize = Math.min(img.width, img.height);

                if (img.width !== img.height) {
                    cropX = (img.width - cropSize) / 2;
                    cropY = (img.height - cropSize) / 2;
                }

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                canvas.width = 1200;
                canvas.height = 1200;

                ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, 1200, 1200);

                const watermark = new Image();
                watermark.src = "/watermark.png";

                watermark.onload = () => {
                    const watermarkWidth = canvas.width * 0.35;
                    const watermarkHeight = watermark.height / watermark.width * watermarkWidth;

                    ctx.globalAlpha = 0.45;
                    ctx.drawImage(
                        watermark,
                        canvas.width - watermarkWidth - 25,
                        canvas.height - watermarkHeight - 25,
                        watermarkWidth,
                        watermarkHeight
                    );
                    ctx.globalAlpha = 1;

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], "image.webp", { type: "image/webp" }));
                    }, "image/webp", 0.80);
                };

                watermark.onerror = () => {
                    reject("Watermark লোড করা যায়নি");
                };
            };
            img.onerror = () => {
                reject("ছবি লোড করা যায়নি");
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
};

// Keyword System
window.addKW = () => {
    const val = document.getElementById('kwInput').value.trim();
    if (val && keywords.length < 50) { 
        keywords.push(val.toLowerCase()); 
        renderKeywords(); 
        document.getElementById('kwInput').value = ""; 
    }
};

function renderKeywords() {
    document.getElementById('kwList').innerHTML = keywords.map((k, i) => `
        <div class="keyword-tag">${k} <i class="fas fa-times" onclick="removeKW(${i})"></i></div>
    `).join('');
}

window.removeKW = (index) => { 
    keywords.splice(index, 1); 
    renderKeywords(); 
};

// Slug Generation
function generateSlug(name) {
    const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\u0980-\u09FF\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

    const numbers = () =>
        Math.floor(Math.random() * 9 + 1).toString() +
        Math.floor(Math.random() * 9 + 1).toString();

    const letters = () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26)) +
        String.fromCharCode(97 + Math.floor(Math.random() * 26));

    return `${base}-${numbers()}${letters()}`;
}

// Upload Product Logic
window.uploadProduct = async () => {
    const btn = document.getElementById('upBtn');
    const user = auth.currentUser;
    const userRef = doc(db, "users", user.uid);
    
    const name = document.getElementById('pName').value.trim();
    const slug = generateSlug(name);       
    const price = parseInt(document.getElementById('pPrice').value);
    const oldPrice = parseInt(document.getElementById('oldPrice').value) || price; 
    const desc = document.getElementById('pDesc').value.trim();
    const catSelect = document.getElementById('pCategory');
    const categorySlug = catSelect.value;
    const categoryName = catSelect.options[catSelect.selectedIndex].text;
    const apiSelector = document.getElementById('apiSelector');
    const selectedApiId = apiSelector.value;
    const f1 = document.getElementById('img1').files[0];

    // Validation
    if (!selectedApiId) {
        alert("দয়া করে একটি Image Upload API নির্বাচন করুন");
        return;
    }
    if (!categorySlug) {
        alert("দয়া করে একটি ক্যাটাগরি নির্বাচন করুন");
        return;
    }
    if (!name || isNaN(price) || !f1 || keywords.length === 0) {
        alert("সব প্রয়োজনীয় তথ্য সঠিকভাবে পূরণ করুন!");
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    let selectedApiKey = null;

    try {
        // Fetch only the selected API document from Firestore at upload time
        const apiDocRef = doc(db, "api_keys", selectedApiId);
        const apiDocSnap = await getDoc(apiDocRef);

        if (!apiDocSnap.exists() || apiDocSnap.data().status !== "active") {
            throw new Error("INVALID_API_KEY");
        }

        selectedApiKey = apiDocSnap.data().apiKey;

        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const data = userDoc.data();
            
            let currentCount = (data.lastUploadDate === today) ? (data.todayUploads || 0) : 0;

            if (currentCount >= 5) {
                throw new Error("LIMIT_EXCEEDED");
            }

            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> আপলোড হচ্ছে...';

            // Process and upload images using the fetched API Key internally
            const files = [f1, document.getElementById('img2').files[0]].filter(f => f);
            const imgUrls = [];
            
            for (let file of files) {
                const webpFile = await convertToWebP(file);
                const formData = new FormData(); 
                formData.append("image", webpFile);
                
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${selectedApiKey}`, { 
                    method: "POST", 
                    body: formData 
                });
                const json = await res.json();
                if (json.success) {
                    imgUrls.push(json.data.url);
                } else {
                    throw new Error("IMGBB_UPLOAD_FAILED");
                }
            }

            // Save Product to Firestore
            await addDoc(collection(db, "products"), {
                name,
                slug,
                description: desc,
                price,
                oldPrice,
                keywords,
                images: imgUrls,
                categoryName,
                categorySlug,
                sellerId: user.uid,
                shopName: data.shopName,
                whatsapp: data.whatsapp,
                active: true,
                createdAt: Date.now()
            });

            // Update user daily limit count
            transaction.update(userRef, {
                todayUploads: currentCount + 1,
                lastUploadDate: today
            });
        });

        alert("পণ্যটি সফলভাবে যোগ করা হয়েছে!");
        window.location.href = "dashboard.html";

    } catch (err) {
        if (err.message === "LIMIT_EXCEEDED") {
            alert("আজকের আপলোড সীমা (৫টি) শেষ!");
        } else if (err.message === "IMGBB_UPLOAD_FAILED") {
            alert("ছবি আপলোড ব্যর্থ হয়েছে। দয়া করে সঠিক API Key ব্যবহার করুন।");
        } else if (err.message === "INVALID_API_KEY") {
            alert("নির্বাচিত API Key নিষ্ক্রিয় বা পাওয়া যায়নি।");
        } else {
            console.error(err);
            alert("আপলোড সমস্যা হয়েছে।");
        }
        
        btn.disabled = false;
        btn.innerHTML = "আপলোড শুরু করুন";
    } finally {
        // Immediately scrub the API key from memory reference
        selectedApiKey = null;
    }
};
