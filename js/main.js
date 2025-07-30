// 카테고리별 가짜 상품 데이터
const FAKE_PRODUCTS = [
    { id: 1, name: '아메리카노', price: 3000, category: 'coffee' },
    { id: 2, name: '카페라떼', price: 4000, category: 'coffee' },
    { id: 3, name: '카푸치노', price: 4500, category: 'coffee' },
    { id: 4, name: '카라멜 마키아토', price: 5000, category: 'coffee' },
    { id: 5, name: '바닐라라떼', price: 4500, category: 'coffee' },
    { id: 6, name: '모카', price: 5000, category: 'coffee' },
    { id: 7, name: '아이스티', price: 3500, category: 'beverage' },
    { id: 8, name: '레몬에이드', price: 4000, category: 'beverage' },
    { id: 9, name: '스무디', price: 5500, category: 'beverage' },
    { id: 10, name: '치즈케이크', price: 6000, category: 'dessert' },
    { id: 11, name: '초콜릿케이크', price: 6500, category: 'dessert' },
    { id: 12, name: '마카롱', price: 2500, category: 'dessert' },
    { id: 13, name: '크로와상', price: 3000, category: 'dessert' },
    { id: 14, name: '샌드위치', price: 7000, category: 'food' },
    { id: 15, name: '샐러드', price: 8000, category: 'food' }
];

const CATEGORY_NAMES = {
    coffee: '커피',
    beverage: '음료',
    dessert: '디저트',
    food: '푸드'
};

let orderItems = [];
let currentCategory = 'all';

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로그인 체크
    if (!SessionManager.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        window.location.href = '../index.html';
        return;
    }
    
    initializePage();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
});

// 페이지 초기화
function initializePage() {
    displayStoreInfo();
    renderProducts();
    setupEventListeners();
}

// 매장 정보 표시
function displayStoreInfo() {
    const sessionInfo = SessionManager.get();
    if (sessionInfo) {
        const headerTitle = document.querySelector('.pos-header h1');
        headerTitle.textContent = `UNEAR POS - ${sessionInfo.placeName}`;
    }
}

// 현재 시간 업데이트
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('ko-KR');
    document.getElementById('currentTime').textContent = timeString;
}

// 상품 목록 렌더링
function renderProducts() {
    const productGrid = document.getElementById('productGrid');
    productGrid.innerHTML = '';

    FAKE_PRODUCTS.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-item';
        productElement.dataset.productId = product.id;
        
        productElement.innerHTML = `
            <div class="product-name">${product.name}</div>
            <div class="product-price">${product.price.toLocaleString()}원</div>
        `;
        
        productElement.addEventListener('click', () => addToOrder(product));
        productGrid.appendChild(productElement);
    });
}

// 주문에 상품 추가
function addToOrder(product) {
    const existingItem = orderItems.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        orderItems.push({
            ...product,
            quantity: 1
        });
    }
    
    renderOrderList();
    updateTotalAmount();
}

// 주문 목록 렌더링
function renderOrderList() {
    const orderList = document.getElementById('orderList');
    
    if (orderItems.length === 0) {
        orderList.innerHTML = `
            <div class="empty-order">
                <p>선택된 상품이 없습니다</p>
            </div>
        `;
        return;
    }
    
    orderList.innerHTML = '';
    
    orderItems.forEach(item => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-item';
        
        orderElement.innerHTML = `
            <div class="order-item-info">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-price">${item.price.toLocaleString()}원</div>
            </div>
            <div class="order-item-controls">
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                <span class="quantity">${item.quantity}</span>
                <button class="quantity-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromOrder(${item.id})">삭제</button>
            </div>
        `;
        
        orderList.appendChild(orderElement);
    });
}

// 수량 변경
function changeQuantity(productId, change) {
    const item = orderItems.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromOrder(productId);
        } else {
            renderOrderList();
            updateTotalAmount();
        }
    }
}

// 주문에서 제거
function removeFromOrder(productId) {
    orderItems = orderItems.filter(item => item.id !== productId);
    renderOrderList();
    updateTotalAmount();
}

// 총 금액 업데이트
function updateTotalAmount() {
    const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('totalAmount').textContent = `${total.toLocaleString()}원`;
    
    const paymentBtn = document.getElementById('paymentBtn');
    paymentBtn.disabled = orderItems.length === 0;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 매장 정보 드롭다운
    const storeInfoBtn = document.getElementById('storeInfoBtn');
    const dropdown = document.querySelector('.store-info-dropdown');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    storeInfoBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdown.classList.toggle('active');
    });
    
    // 드롭다운 외부 클릭시 닫기
    document.addEventListener('click', function() {
        dropdown.classList.remove('active');
    });
    
    dropdownMenu.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    
    // 매장 정보 조회 버튼
    document.getElementById('storeDetailBtn').addEventListener('click', function() {
        showStoreModal();
        dropdown.classList.remove('active');
    });
    
    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        const result = await apiCall(API_CONFIG.ENDPOINTS.LOGOUT, {
            method: 'POST'
        });
        
        SessionManager.clear();
        alert('로그아웃되었습니다.');
        window.location.href = '../index.html';
    });
    
    // 모달 닫기
    document.getElementById('modalCloseBtn').addEventListener('click', hideStoreModal);
    document.getElementById('storeModalOverlay').addEventListener('click', function(e) {
        if (e.target === this) {
            hideStoreModal();
        }
    });
    
    // 결제 버튼
    document.getElementById('paymentBtn').addEventListener('click', function() {
        if (orderItems.length > 0) {
            // 주문 데이터를 세션에 저장
            const orderData = {
                items: orderItems,
                totalAmount: orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };
            
            // 세션 스토리지에 임시 저장
            try {
                sessionStorage.setItem('tempOrderData', JSON.stringify(orderData));
                window.location.href = 'payment.html';
            } catch (e) {
                // sessionStorage 실패시 URL 파라미터 사용
                const orderDataParam = encodeURIComponent(JSON.stringify(orderData));
                window.location.href = `payment.html?orderData=${orderDataParam}`;
            }
        }
    });
}

// 매장 정보 모달 표시
function showStoreModal() {
    const sessionInfo = SessionManager.get();
    if (!sessionInfo) return;
    
    const modalContent = document.getElementById('storeModalContent');
    modalContent.innerHTML = `
        <div class="store-info-item">
            <span class="store-info-label">매장명</span>
            <span class="store-info-value">${sessionInfo.placeName}</span>
        </div>
        <div class="store-info-item">
            <span class="store-info-label">매장 설명</span>
            <span class="store-info-value">${sessionInfo.placeDesc || '-'}</span>
        </div>
        <div class="store-info-item">
            <span class="store-info-label">주소</span>
            <span class="store-info-value">${sessionInfo.address}</span>
        </div>
        <div class="store-info-item">
            <span class="store-info-label">전화번호</span>
            <span class="store-info-value">${sessionInfo.tel || '-'}</span>
        </div>
        <div class="store-info-item">
            <span class="store-info-label">운영시간</span>
            <span class="store-info-value">${formatOperatingTime(sessionInfo.startTime, sessionInfo.endTime)}</span>
        </div>
        <div class="store-info-item">
            <span class="store-info-label">카테고리</span>
            <span class="store-info-value">${sessionInfo.placeCategory}</span>
        </div>
        <div class="store-info-item">
            <span class="store-info-label">사장님</span>
            <span class="store-info-value">${sessionInfo.ownerName}</span>
        </div>
    `;
    
    document.getElementById('storeModalOverlay').classList.add('active');
}

// 매장 정보 모달 숨기기
function hideStoreModal() {
    document.getElementById('storeModalOverlay').classList.remove('active');
}

// 운영시간 포맷팅
function formatOperatingTime(startTime, endTime) {
    if (!startTime || !endTime) return '-';
    
    const formatTime = (time) => {
        const hours = Math.floor(time / 100);
        const minutes = time % 100;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    };
    
    return `${formatTime(startTime)} ~ ${formatTime(endTime)}`;
}