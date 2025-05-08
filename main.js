
// main.js - الملف الرئيسي المعدل

// ================ قسم الإعدادات القابلة للتعديل ================


// ================ الأكواد الرئيسية ================

// reload

// التحقق مما إذا كان الزائر قد زار الصفحة من قبل
const isReturningVisitor = localStorage.getItem('visitedBefore');

document.addEventListener('DOMContentLoaded', function() {
    const preloader = document.getElementById('preloader');
    
    if (!isReturningVisitor) {
        // إظهار شاشة التحميل فقط للزائرين الجدد
        preloader.style.display = 'flex';
        localStorage.setItem('visitedBefore', 'true');
        
        // إعداد متغيرات نسبة التحميل
        let loadingProgress = 0;
        const progressInterval = 300;
        const targetProgress = 100;
        const minDisplayTime = 3000;

        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar-inner');
        const startTime = Date.now();

        const progressIntervalId = setInterval(() => {
            if (loadingProgress < targetProgress) {
                loadingProgress += Math.floor(Math.random() * 15) + 5;
                if (loadingProgress > targetProgress) loadingProgress = targetProgress;
                
                progressText.textContent = `${loadingProgress}%`;
                progressBar.style.width = `${loadingProgress}%`;
                
                if (loadingProgress < 40) {
                    progressBar.style.background = '#ff4d4d';
                } else if (loadingProgress < 70) {
                    progressBar.style.background = '#ffcc00';
                } else {
                    progressBar.style.background = '#22c55e';
                }
            }
        }, progressInterval);

        const hideAfterMinTime = setTimeout(() => {
            finishLoading();
        }, minDisplayTime);

        window.addEventListener('productsLoaded', () => {
            loadingProgress = 100;
            progressText.textContent = '100%';
            progressBar.style.width = '100%';
            progressBar.style.background = '#22c55e';
            
            const elapsed = Date.now() - startTime;
            if (elapsed >= minDisplayTime) {
                finishLoading();
            } else {
                setTimeout(finishLoading, minDisplayTime - elapsed);
            }
        });

        function finishLoading() {
            clearInterval(progressIntervalId);
            clearTimeout(hideAfterMinTime);
            hidePreloader();
        }
    } else {
        // إخفاء شاشة التحميل فوراً للزائرين العائدين
        preloader.style.display = 'none';
    }
});

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }
}

// الوظيفة التي تنقل البيانات إلى صفحة الطلب
function orderNow(productName, price, imageUrls) {
    const queryParams = "?productName=" + encodeURIComponent(productName) +
                      "&price=" + encodeURIComponent(price) +
                      "&imageUrls=" + encodeURIComponent(JSON.stringify(imageUrls));
    window.location.href = "order.html" + queryParams;
}

// إضافة sitemap
const domain = window.location.origin;
const link = document.createElement("link");
link.rel = "sitemap";
link.type = "application/xml";
link.title = "Sitemap";
link.href = domain + "/sitemap.xml";
document.head.appendChild(link);

// البحث عن المنتجات
document.getElementById('searchForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let searchQuery = document.getElementById('searchInput').value.toLowerCase();
    let products = document.querySelectorAll('.card');
    let found = false;

    products.forEach(function(product) {
        let productName = product.querySelector('.shirt_text').innerText.toLowerCase();
        if (productName.includes(searchQuery)) {
            product.style.display = 'block';
            found = true;
        } else {
            product.style.display = 'none';
        }
    });

    if (!found) {
        document.getElementById('noResultsMessage').style.display = 'block';
    } else {
        document.getElementById('noResultsMessage').style.display = 'none';
    }
});

// إظهار/إخفاء قائمة الهاتف
function togglePhoneList() {
    const phoneList = document.getElementById("phoneList");
    phoneList.style.display = phoneList.style.display === "block" ? "none" : "block";
}

document.addEventListener("click", function(event) {
    const phoneList = document.getElementById("phoneList");
    const phoneIcon = document.querySelector(".phone-icon");
    if (!phoneList.contains(event.target) && !phoneIcon.contains(event.target)) {
        phoneList.style.display = "none";
    }
});

// تحميل المنتجات
document.addEventListener("DOMContentLoaded", async function () {
    let loadingMessage = document.getElementById("loadingMessage");
    let loadingMessageTwo = document.getElementById("loadingMessageTwo");
    let productsContainer = document.querySelector("#products_section3 .cards");
    let productList = document.getElementById("productList");
    let loadMoreBtn = document.getElementById("loadMoreBtn");
    let loadMoreWrapper = document.querySelector(".load-more-wrapper");

    let products = [];
    let currentIndex = 0;
    const itemsPerPage = 8;

    try {
        const sessionCached = sessionStorage.getItem("products_session");
        if (sessionCached) {
            console.log("📦 تحميل من sessionStorage");
            products = JSON.parse(sessionCached);
        } else {
            const response = await fetch(CONFIG.PRODUCTS_API);
            const data = await response.json();
            products = data.products || [];
            sessionStorage.setItem("products_session", JSON.stringify(products));
        }
    } catch (error) {
        console.warn("⚠️ فشل التحميل من الإنترنت، نحاول من الكاش...");
        try {
            const cache = await caches.open('data-v1');
            const cachedResponse = await cache.match(CONFIG.PRODUCTS_API);
            if (cachedResponse) {
                const cachedData = await cachedResponse.json();
                products = cachedData.products || [];
                console.log("✅ تم التحميل من Service Worker cache");
            } else {
                throw new Error("❌ لا يوجد نسخة مخزنة.");
            }
        } catch (cacheError) {
            console.error("❌ فشل التحميل من الكاش:", cacheError);
            if (loadingMessage) loadingMessage.innerHTML = "⚠ لا يمكن تحميل المنتجات بدون اتصال.";
            return;
        }
    }

    // إخفاء الرسائل وتنظيف العرض
    if (loadingMessage) loadingMessage.style.display = "none";
    if (loadingMessageTwo) loadingMessageTwo.style.display = "none";
    if (productsContainer) productsContainer.innerHTML = "";
    if (productList) productList.innerHTML = "";

    // دالة عرض دفعة من المنتجات
    function showMoreProducts() {
        const endIndex = currentIndex + itemsPerPage;
        const itemsToShow = products.slice(currentIndex, endIndex);

        itemsToShow.forEach((product, index) => {
            let imagesArray = product.images.map(img => `'${img}'`).join(",");
            let image = product.images[0] || "";

            if (productsContainer) {
                let productCard = `
                    <div class="card" onclick="orderNow('${product.name}', '${product.price}', [${imagesArray}])" style="cursor: pointer;">
                        <div class="image">
                            <img src="${image}" loading="lazy" alt="${product.name}">
                        </div>
                        <h4 class="shirt_text">${product.name}</h4>
                        <div class="rating" style="display: flex; gap: 2px; justify-content: center;">
                            <span style="color: gold; font-size: 20px;">★</span>
                            <span style="color: gold; font-size: 20px;">★</span>
                            <span style="color: gold; font-size: 20px;">★</span>
                            <span style="color: gold; font-size: 20px;">★</span>
                            <span style="color: gold; font-size: 20px;">★</span>
                        </div>
                        <div class="info" dir="rtl">
                            <span class="pr1">${product.price} دج</span>
                        </div>
                        ${product.originalPrice ? `
                        <div class="pr2div">
                            <span class="pr2">${product.originalPrice} دج</span>
                        </div>` : ''}
                    </div>
                `;
                productsContainer.innerHTML += productCard;
            }

            if (productList) {
                let productRow = document.createElement("div");
                productRow.className = "product-row";
                productRow.innerHTML = `
                    <span>${product.name} - ${product.price} دج</span>
                    <button class="delete-btn" onclick="deleteProduct(${currentIndex + index})">🗑 حذف</button>
                `;
                productList.appendChild(productRow);
            }
        });

        currentIndex = endIndex;

        if (currentIndex >= products.length && loadMoreWrapper) {
            loadMoreWrapper.style.display = "none";
        }
    }

    // عرض أول دفعة
    showMoreProducts();

    // إظهار زر "عرض المزيد" إذا تجاوز عدد المنتجات 10
    if (products.length > itemsPerPage && loadMoreWrapper) {
        loadMoreWrapper.style.display = "block";
    }

    // عند الضغط على الزر
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener("click", showMoreProducts);
    }
});

// تحميل بيانات المتجر
document.addEventListener("DOMContentLoaded", async function () {
    try {
        const response = await fetch(CONFIG.STORE_API);
        const data = await response.json();

        // تحديث اسم المتجر
        if (data.storeName) {
            document.title = data.storeName;
            document.getElementById("storeName").textContent = data.storeName;
        }

        // تحديث أرقام الهاتف
        if (data.phoneNumbers) {
            let phoneList = document.getElementById("phoneList");
            phoneList.innerHTML = "";
            data.phoneNumbers.forEach(phone => {
                let phoneLink = document.createElement("a");
                phoneLink.href = "tel:" + phone;
                phoneLink.textContent = phone;
                phoneList.appendChild(phoneLink);
            });
        }

        // تحديث روابط مواقع التواصل الاجتماعي
        if (data.socialLinks) {
            document.getElementById("facebookLink").href = data.socialLinks.facebook || "#";
            document.getElementById("instagramLink").href = data.socialLinks.instagram || "#";
            document.getElementById("tiktokLink").href = data.socialLinks.tiktok || "#";
        }

        // تحديث رقم الواتساب
        if (data.whatsappNumber) {
            let formattedNumber = data.whatsappNumber.replace(/\s+/g, "").replace(/[^0-9+]/g, "");
            document.getElementById("whatsappLink").href = "https://wa.me/" + formattedNumber;
        }

    } catch (error) {
        console.error("❌ خطأ أثناء تحميل بيانات المتجر:", error);
    }
});

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log("✅ Service Worker Registered"))
        .catch(err => console.log("❌ Service Worker Registration Failed", err));
}

// تأثير العنوان
document.addEventListener("DOMContentLoaded", function () {
    const title = document.getElementById("title");

    setTimeout(() => {
        title.classList.add("visible");

        setTimeout(() => {
            title.style.animation = "pulse 0.6s ease-in-out";
        }, 1000);
    }, 500);
});

// زر العودة للأعلى
const backToTopButton = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
    if (window.scrollY > 300) {
        backToTopButton.classList.add("show");
    } else {
        backToTopButton.classList.remove("show");
    }
});

backToTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
});

// الوضع الليلي
document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("toggle");
    const body = document.body;

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        body.classList.add("dark-mode");
        toggle.checked = true;
    } else {
        body.classList.remove("dark-mode");
        toggle.checked = false;
    }

    toggle.addEventListener("change", function () {
        if (toggle.checked) {
            body.classList.add("dark-mode");
            localStorage.setItem("theme", "dark");
        } else {
            body.classList.remove("dark-mode");
            localStorage.setItem("theme", "light");
        }
    });
});

// Facebook Pixel
document.addEventListener("DOMContentLoaded", async function () {
    try {
        const response = await fetch(CONFIG.PRODUCTS_API); 
        const data = await response.json();

        if (data.facebookPixel) {
            let pixelID = extractPixelID(data.facebookPixel); 
            if (pixelID) {
                insertFacebookPixel(pixelID);
            }
        }
    } catch (error) {
        console.error("❌ خطأ أثناء تحميل Facebook Pixel:", error);
    }
});

function extractPixelID(input) {
    if (/^\d{10,20}$/.test(input.trim())) {
        return input.trim();
    }
    let match = input.match(/fbq\('init',\s*'(\d+)'\)/);
    return match ? match[1] : null;
}

function insertFacebookPixel(pixelID) {
    if (!pixelID) {
        console.error("❌ لم يتم العثور على Facebook Pixel ID!");
        return;
    }

    let pixelScript = document.createElement("script");
    pixelScript.textContent = `
        !function(f,b,e,v,n,t,s) {
            if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)
        }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');

        fbq('init', '${pixelID}');
        fbq('track', 'PageView');
    `;
    document.head.appendChild(pixelScript);

    let noscript = document.createElement("noscript");
    noscript.innerHTML = `
        <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${pixelID}&ev=PageView&noscript=1" />
    `;
    document.body.appendChild(noscript);

    console.log("🎯 Facebook Pixel مفعل بالمعرف:", pixelID);
}