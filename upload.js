import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDb, collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase Configuration (Standard public config, rules handle security)
const firebaseConfig = {
    apiKey: "AIzaSyBUhNhYvuo_FTvZ5RZR6Gn-4hsUY21S0XE",
    authDomain: "ghotimarket.firebaseapp.com",
    projectId: "ghotimarket",
    storageBucket: "ghotimarket.appspot.com",
    messagingSenderId: "9382019283",
    appId: "1:9382019283:web:abc12345"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global Variables
let currentSellerData = null;
let keywordsList = [];
const BACKEND_UPLOAD_ENDPOINT = "https://your-backend-api-endpoint.com/api/upload-image"; // Backend Proxy Endpoint

// DOM Elements
const shopNameDisplay = document.getElementById("shopNameDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const productForm = document.getElementById("productUploadForm");
const categorySelect = document.getElementById("productCategory");
const keywordInput = document.getElementById("keywordInput");
const addKeywordBtn = document.getElementById("addKeywordBtn");
const keywordTagsContainer = document.getElementById("keywordTagsContainer");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingText = document.getElementById("loadingText");
const customPopup = document.getElementById("customPopup");
const popupIcon = document.getElementById("popupIcon");
const popupTitle = document.getElementById("popupTitle");
const popupMessage = document.getElementById("popupMessage");
const popupCloseBtn = document.getElementById("popupCloseBtn");

let popupCloseCallback = null;

// Show Custom Popup
function showPopup(title, message, type = "error", onClose = null) {
    popupTitle.textContent = title;
    popupMessage.textContent = message;
    popupIcon.className = `popup-icon ${type}`;
    popupIcon.innerHTML = type === "success" ? "✓" : "✕";
    popupCloseCallback = onClose;
    customPopup.classList.remove("hidden");
}

popupCloseBtn.addEventListener("click", () => {
    customPopup.classList.add("hidden");
    if (typeof popupCloseCallback === "function") {
        popupCloseCallback();
    }
});

function showLoading(text = "প্রক্রিয়াধীন রয়েছে...") {
    loadingText.textContent = text;
    loadingOverlay.classList.remove("hidden");
}

function hideLoading() {
    loadingOverlay.classList.add("hidden");
}

// Authentication & Authorization Check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    try {
        showLoading("অনুমতি যাচাই করা হচ্ছে...");
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            hideLoading();
            showPopup("অনুমতি নেই", "আপনার সেলার অ্যাকাউন্ট পাওয়া যায়নি।", "error", () => {
                window.location.href = "locked.html";
            });
            return;
        }

        const userData = userDoc.data();
        const currentTime = Date.now();

        if (userData.active !== true || !userData.profileUnlockedUntil || userData.profileUnlockedUntil < currentTime) {
            hideLoading();
            showPopup("অ্যাকাউন্ট লক", "আপনার সেলার অ্যাকাউন্টটি সক্রিয় নয় অথবা মেয়াদ শেষ হয়ে গেছে।", "error", () => {
                window.location.href = "locked.html";
            });
            return;
        }

        currentSellerData = {
            uid: user.uid,
            shopName: userData.shopName || "ਘটি মার্কেট সেলার",
            whatsapp: userData.whatsapp || "8801700000000",
            ...userData
        };

        shopNameDisplay.textContent = currentSellerData.shopName;
        await loadCategories();
        hideLoading();
    } catch (error) {
        hideLoading();
        showPopup("ত্রুটি", "সেলার ডেটা লোড করতে সমস্যা হয়েছে: " + error.message, "error");
    }
});

// Logout Handler
logoutBtn.addEventListener("click", async () => {
    try {
        await signOut(auth);
        window.location.href = "login.html";
    } catch (error) {
        showPopup("ত্রুটি", "লগআউট করতে সমস্যা হয়েছে।", "error");
    }
});

// Load Categories from Firestore
async function loadCategories() {
    try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        querySnapshot.forEach((docSnap) => {
            const cat = docSnap.data();
            const option = document.createElement("option");
            option.value = cat.slug;
            option.textContent = cat.categoryName;
            option.setAttribute("data-name", cat.categoryName);
            categorySelect.appendChild(option);
        });
    } catch (error) {
        showPopup("ত্রুটি", "ক্যাটাগরি লোড করা যায়নি।", "error");
    }
}

// Keyword System Management
addKeywordBtn.addEventListener("click", (e) => {
    e.preventDefault();
    addKeyword();
});

keywordInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        addKeyword();
    }
});

function addKeyword() {
    const val = keywordInput.value.trim().toLowerCase();
    if (!val) return;
    if (keywordsList.length >= 50) {
        showPopup("সতর্কবার্তা", "সর্বোচ্চ ৫০টি কীওয়ার্ড যুক্ত করা যাবে।", "error");
        return;
    }
    if (keywordsList.includes(val)) {
        keywordInput.value = "";
        return;
    }

    keywordsList.push(val);
    renderKeywords();
    keywordInput.value = "";
}

function renderKeywords() {
    keywordTagsContainer.innerHTML = "";
    keywordsList.forEach((kw, index) => {
        const tag = document.createElement("div");
        tag.className = "keyword-tag";
        tag.innerHTML = `${kw} <span data-index="${index}">×</span>`;
        tag.querySelector("span").addEventListener("click", () => {
            keywordsList.splice(index, 1);
            renderKeywords();
        });
        keywordTagsContainer.appendChild(tag);
    });
}

// Image Preview & Handling
document.getElementById("image1").addEventListener("change", function(e) {
    handleImagePreview(e, "labelImage1");
});
document.getElementById("image2").addEventListener("change", function(e) {
    handleImagePreview(e, "labelImage2");
});

function handleImagePreview(event, labelId) {
    const file = event.target.files[0];
    const label = document.getElementById(labelId);
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            label.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        }
        reader.readAsDataURL(file);
    }
}

// Image Processing (Resize, WebP, Watermark simulation in frontend before sending to backend)
async function processImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            const img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;
                const maxDim = 1200;

                if (width > height) {
                    if (width > maxDim) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    }
                } else {
                    if (height > maxDim) {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Load watermark.png and apply on canvas
                const watermarkImg = new Image();
                watermarkImg.src = "watermark.png";
                watermarkImg.onload = function() {
                    const wmWidth = width * 0.25;
                    const wmHeight = (watermarkImg.height * wmWidth) / watermarkImg.width;
                    const wmX = width - wmWidth - 20;
                    const wmY = height - wmHeight - 20;

                    ctx.save();
                    ctx.globalAlpha = 0.7;
                    ctx.drawImage(watermarkImg, wmX, wmY, wmWidth, wmHeight);
                    ctx.restore();

                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error("ইমেজ প্রসেসিং ব্যর্থ হয়েছে।"));
                            return;
                        }
                        const processedFile = new File([blob], "upload.webp", {
                            type: "image/webp",
                            lastModified: Date.now()
                        });
                        resolve(processedFile);
                    }, "image/webp", 0.85);
                };
                watermarkImg.onerror = function() {
                    reject(new Error("watermark.png লোড করতে ব্যর্থ হয়েছে।"));
                };
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

// Upload Image via Backend Proxy API
async function uploadImageToBackend(file) {
    const processedFile = await processImageFile(file);
    const formData = new FormData();
    formData.append("image", processedFile);

    const response = await fetch(BACKEND_UPLOAD_ENDPOINT, {
        method: "POST",
        body: formData
    });

    if (!response.ok) {
        throw new Error("ইমেজ আপলোড সার্ভারে ত্রুটি দেখা দিয়েছে।");
    }

    const data = await response.json();
    if (!data.success || !data.imageUrl) {
        throw new Error(data.message || "ইমেজ লিংক পাওয়া যায়নি।");
    }

    return data.imageUrl;
}

// Slug Generator
function generateSlug(name) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    const randomSuffix = Math.random().toString(36.substring(2, 6));
    return `${cleanName}-${randomSuffix}`;
}

// Form Submit Handler & Daily Limit Check
productForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!currentSellerData) return;

    const name = document.getElementById("productName").value.trim();
    const categorySelectEl = document.getElementById("productCategory");
    const categorySlug = categorySelectEl.value;
    const categoryName = categorySelectEl.options[categorySelectEl.selectedIndex].getAttribute("data-name");
    const description = document.getElementById("productDescription").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const oldPriceVal = document.getElementById("productOldPrice").value;
    const oldPrice = oldPriceVal ? Number(oldPriceVal) : 0;

    const img1File = document.getElementById("image1").files[0];
    const img2File = document.getElementById("image2").files[0];

    if (!img1File) {
        showPopup("সতর্কবার্তা", "কমপক্ষে ১টি ছবি দেওয়া বাধ্যতামূলক।", "error");
        return;
    }

    try {
        showLoading("দৈনিক আপলোড লিমিট যাচাই করা হচ্ছে...");

        const userDocRef = doc(db, "users", currentSellerData.uid);
        const userSnapshot = await getDoc(userDocRef);
        const userData = userSnapshot.data();

        const todayStr = new Date().toISOString().split("T")[0];
        let todayUploads = userData.todayUploads || 0;
        let lastUploadDate = userData.lastUploadDate || "";

        if (lastUploadDate !== todayStr) {
            todayUploads = 0;
            lastUploadDate = todayStr;
        }

        if (todayUploads >= 5) {
            hideLoading();
            showPopup("আজকের লিমিট শেষ", "আপনার আজকের ৫টি পণ্য আপলোড করার সীমা শেষ হয়ে গেছে।", "error");
            return;
        }

        showLoading("ছবি আপলোড করা হচ্ছে...");
        const uploadedImages = [];
        
        const url1 = await uploadImageToBackend(img1File);
        uploadedImages.push(url1);

        if (img2File) {
            const url2 = await uploadImageToBackend(img2File);
            uploadedImages.push(url2);
        }

        showLoading("পণ্য ডেটাবেজে সংরক্ষণ করা হচ্ছে...");

        const productSlug = generateSlug(name);
        const productData = {
            name: name,
            slug: productSlug,
            description: description,
            price: price,
            oldPrice: oldPrice,
            keywords: keywordsList,
            images: uploadedImages,
            categoryName: categoryName,
            categorySlug: categorySlug,
            sellerId: currentSellerData.uid,
            shopName: currentSellerData.shopName,
            whatsapp: currentSellerData.whatsapp,
            active: true,
            createdAt: Date.now()
        };

        // Save Product
        await addDoc(collection(db, "products"), productData);

        // Update User Upload Count
        await setDoc(userDocRef, {
            todayUploads: todayUploads + 1,
            lastUploadDate: lastUploadDate
        }, { merge: true });

        hideLoading();
        showPopup("সফলভাবে সম্পন্ন", "পণ্য সফলভাবে যুক্ত হয়েছে!", "success", () => {
            window.location.reload();
        });

    } catch (error) {
        hideLoading();
        showPopup("ত্রুটি", error.message || "পণ্য আপলোড করার সময় সমস্যা হয়েছে।", "error");
    }
});
