let orderData = null;
let selectedPaymentMethod = 'CARD';
let appliedDiscounts = [];
let currentMemberInfo = null;
let selectedPolicy = null;
let selectedAuthType = 'barcode';

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 로그인 체크
    if (!SessionManager.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        window.location.href = '../index.html';
        return;
    }

    // 주문 데이터 가져오기 (세션 스토리지 우선, URL 파라미터 대안)
    let orderDataParam = null;
    
    try {
        // 1. 세션 스토리지에서 시도
        orderDataParam = sessionStorage.getItem('tempOrderData');
        if (orderDataParam) {
            orderData = JSON.parse(orderDataParam);
            sessionStorage.removeItem('tempOrderData'); // 사용 후 삭제
        }
    } catch (e) {
        console.warn('sessionStorage read error:', e);
    }
    
    // 2. URL 파라미터에서 시도
    if (!orderData) {
        const urlParams = new URLSearchParams(window.location.search);
        orderDataParam = urlParams.get('orderData');
        
        if (!orderDataParam) {
            alert('주문 데이터가 없습니다.');
            window.location.href = 'main.html';
            return;
        }

        try {
            orderData = JSON.parse(decodeURIComponent(orderDataParam));
        } catch (error) {
            console.error('URL 파라미터 파싱 오류:', error);
            alert('주문 데이터 오류');
            window.location.href = 'main.html';
            return;
        }
    }

    initializePage();
});

// 페이지 초기화
function initializePage() {
    renderOrderItems();
    updateTotalAmount();
    setupEventListeners();
}

// 주문 항목 렌더링
function renderOrderItems() {
    const orderItemsContainer = document.getElementById('orderItems');
    orderItemsContainer.innerHTML = '';

    orderData.items.forEach(item => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        
        orderItem.innerHTML = `
            <div class="order-item-info">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-details">${item.price.toLocaleString()}원 × ${item.quantity}</div>
            </div>
            <div class="order-item-amount">${(item.price * item.quantity).toLocaleString()}원</div>
        `;
        
        orderItemsContainer.appendChild(orderItem);
    });
}

// 총 금액 업데이트
function updateTotalAmount() {
    const originalTotal = orderData.totalAmount;
    const discountAmount = appliedDiscounts.reduce((sum, discount) => sum + discount.amount, 0);
    const finalAmount = originalTotal - discountAmount;

    document.getElementById('totalAmount').textContent = `${originalTotal.toLocaleString()}원`;
    document.getElementById('finalAmount').textContent = `${finalAmount.toLocaleString()}원`;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    // 뒤로가기 버튼
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'main.html';
        });
    }

    // 결제 방법 선택
    const paymentMethodBtns = document.querySelectorAll('.payment-method-btn');
    paymentMethodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            paymentMethodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedPaymentMethod = this.dataset.method;
        });
    });

    // 인증 방법 선택
    const authMethodBtns = document.querySelectorAll('.auth-method-btn');
    authMethodBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            authMethodBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedAuthType = this.dataset.type;
            
            const input = document.getElementById('membershipInput');
            if (input) {
                input.placeholder = selectedAuthType === 'barcode' ? '바코드를 입력하세요' : '전화번호를 입력하세요';
                input.value = '';
            }
        });
    });

    // 멤버십 취소/적용 버튼
    const memberCancelBtn = document.getElementById('memberCancelBtn');
    if (memberCancelBtn) {
        memberCancelBtn.addEventListener('click', function() {
            const dropdown = document.getElementById('membershipDropdown');
            if (dropdown) dropdown.classList.remove('active');
        });
    }

    const memberApplyBtn = document.getElementById('memberApplyBtn');
    if (memberApplyBtn) {
        memberApplyBtn.addEventListener('click', applyMembership);
    }

    // 쿠폰 확인 버튼
    const couponVerifyBtn = document.getElementById('couponVerifyBtn');
    if (couponVerifyBtn) {
        couponVerifyBtn.addEventListener('click', verifyCoupon);
    }

    // 최종 결제 버튼
    const finalPaymentBtn = document.getElementById('finalPaymentBtn');
    if (finalPaymentBtn) {
        finalPaymentBtn.addEventListener('click', processPayment);
    }

    // 멤버십 확인 버튼들 - 통합
    setupMembershipVerifyButtons();
}

// 멤버십 확인 버튼 설정 (중복 제거)
function setupMembershipVerifyButtons() {
    const verifyButton = document.getElementById('memberVerifyBtn');
    
    if (verifyButton) {
        verifyButton.addEventListener('click', async () => {
            await verifyMembership('memberVerifyBtn');
        });
        console.log('✅ 멤버십 확인 버튼 이벤트 등록됨');
    } else {
        console.error('❌ memberVerifyBtn 버튼을 찾을 수 없음');
    }
}

// 멤버십 확인 함수 (통합)
async function verifyMembership(buttonId) {
    const input = document.getElementById('membershipInput').value.trim();
    const selectedAuthTypeBtn = document.querySelector('.auth-method-btn.active');
    const authType = selectedAuthTypeBtn?.dataset.type || 'barcode';

    if (!input) {
        alert('입력값이 비어 있습니다.');
        return;
    }

    const response = await apiCall(API_CONFIG.ENDPOINTS.MEMBER_VERIFY, {
        method: 'POST',
        body: JSON.stringify({
            type: authType,
            value: input,
            purchaseAmount: orderData.totalAmount
        })
    });

    if (response.success) {
        console.log(`✅ ${buttonId} 인증 성공:`, response.data);
        
        currentMemberInfo = response.data.memberInfo;
        
        if (response.data.policies && response.data.policies.length > 0) {
            displayMemberInfo(currentMemberInfo);
            displayDiscountPolicies(response.data.policies);
            
            // Step 2로 이동
            document.getElementById('membershipStep1').style.display = 'none';
            document.getElementById('membershipStep2').style.display = 'block';
        } else {
            alert('적용 가능한 할인 정책이 없습니다.');
        }
    } else {
        console.error(`❌ ${buttonId} 인증 실패:`, response.message || response.error);
        alert(response.message || '인증 실패');
    }
}

// 멤버십 단계 초기화
function resetMembershipSteps() {
    document.getElementById('membershipStep1').style.display = 'block';
    document.getElementById('membershipStep2').style.display = 'none';
    document.getElementById('membershipInput').value = '';
    currentMemberInfo = null;
    selectedPolicy = null;
}

// 회원 정보 표시
function displayMemberInfo(memberInfo) {
    const memberInfoContainer = document.getElementById('memberInfo');
    memberInfoContainer.innerHTML = `
        <div class="member-detail">
            <span class="member-label">회원명</span>
            <span class="member-value">${memberInfo.memberName}</span>
        </div>
        <div class="member-detail">
            <span class="member-label">등급</span>
            <span class="member-value">${memberInfo.memberGrade}</span>
        </div>
    `;
}

// 할인 정책 리스트 표시
function displayDiscountPolicies(policies) {
    const policyListContainer = document.getElementById('policyList');
    
    if (!policies || policies.length === 0) {
        policyListContainer.innerHTML = '<p style="color: #999; text-align: center;">적용 가능한 할인이 없습니다.</p>';
        return;
    }
    
    policyListContainer.innerHTML = '';
    
    policies.forEach((policy, index) => {
        const policyItem = document.createElement('div');
        policyItem.className = 'policy-item';
        policyItem.dataset.policyIndex = index;
        
        // 할인 정보 포맷팅
        let discountText = '';
        if (policy.fixedDiscount) {
            discountText = `${policy.fixedDiscount.toLocaleString()}원 할인`;
        } else if (policy.discountPercent) {
            discountText = `${policy.discountPercent}% 할인`;
        }
        
        let conditionText = '';
        if (policy.minPurchaseAmount) {
            conditionText += `${policy.minPurchaseAmount.toLocaleString()}원 이상 구매시`;
        }
        if (policy.maxDiscountAmount) {
            conditionText += ` (최대 ${policy.maxDiscountAmount.toLocaleString()}원)`;
        }
        
        policyItem.innerHTML = `
            <div class="policy-name">${discountText}</div>
            <div class="policy-details">${conditionText}</div>
        `;
        
        policyItem.addEventListener('click', function() {
            // 다른 정책 선택 해제
            document.querySelectorAll('.policy-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // 현재 정책 선택
            this.classList.add('selected');
            selectedPolicy = policy;
            
            // 적용 버튼 활성화
            const applyBtn = document.getElementById('memberApplyBtn');
            if (applyBtn) {
                applyBtn.disabled = false;
            }
        });
        
        policyListContainer.appendChild(policyItem);
    });
}

// 멤버십 적용
async function applyMembership() {
    if (!currentMemberInfo || !selectedPolicy) {
        alert('회원 정보 또는 할인 정책이 선택되지 않았습니다.');
        return;
    }

    const applyResult = await apiCall(API_CONFIG.ENDPOINTS.MEMBER_APPLY, {
        method: 'POST',
        body: JSON.stringify({
            memberId: currentMemberInfo.memberId,
            policyId: selectedPolicy.id
        })
    });

    if (applyResult.success) {
        const discountAmount = calculateDiscount(selectedPolicy, orderData.totalAmount);
        
        appliedDiscounts.push({
            type: 'membership',
            name: `멤버십 할인 (${currentMemberInfo.memberGrade})`,
            amount: discountAmount,
            policyId: selectedPolicy.id
        });
        
        renderAppliedDiscounts();
        updateTotalAmount();
        document.getElementById('membershipDropdown').classList.remove('active');
    } else {
        alert(applyResult.message || '멤버십 할인 적용에 실패했습니다.');
    }
}

// 할인 금액 계산
function calculateDiscount(policy, totalAmount) {
    // 최소 구매 금액 체크
    if (policy.minPurchaseAmount && totalAmount < policy.minPurchaseAmount) {
        return 0;
    }
    
    let discountAmount = 0;
    
    if (policy.fixedDiscount) {
        discountAmount = policy.fixedDiscount;
    } else if (policy.discountPercent) {
        discountAmount = Math.floor(totalAmount * policy.discountPercent / 100);
    }
    
    // 최대 할인 금액 제한
    if (policy.maxDiscountAmount && discountAmount > policy.maxDiscountAmount) {
        discountAmount = policy.maxDiscountAmount;
    }
    
    return discountAmount;
}

// 쿠폰 확인
async function verifyCoupon() {
    const couponCode = document.getElementById('couponCode').value.trim();
    
    if (!couponCode) {
        alert('쿠폰 코드를 입력해주세요.');
        return;
    }

    const result = await apiCall(API_CONFIG.ENDPOINTS.COUPON_VERIFY, {
        method: 'POST',
        body: JSON.stringify({
            couponCode: couponCode
        })
    });

    if (result.success) {
        // 쿠폰 할인 적용
        const applyResult = await apiCall(API_CONFIG.ENDPOINTS.COUPON_APPLY, {
            method: 'POST',
            body: JSON.stringify({
                couponCode: couponCode
            })
        });

        if (applyResult.success) {
            appliedDiscounts.push({
                type: 'coupon',
                name: '쿠폰 할인',
                amount: applyResult.data.discountAmount || 500 // 임시값
            });
            renderAppliedDiscounts();
            updateTotalAmount();
            document.getElementById('couponDropdown').classList.remove('active');
            document.getElementById('couponCode').value = '';
        }
    } else {
        alert(result.message || '쿠폰 확인에 실패했습니다.');
    }
}

// 적용된 할인 렌더링
function renderAppliedDiscounts() {
    const appliedDiscountsContainer = document.getElementById('appliedDiscounts');
    if (!appliedDiscountsContainer) return;
    
    appliedDiscountsContainer.innerHTML = '';

    appliedDiscounts.forEach((discount, index) => {
        const discountItem = document.createElement('div');
        discountItem.className = 'discount-item';
        
        discountItem.innerHTML = `
            <div class="discount-info">
                <div class="discount-name">${discount.name}</div>
                <div class="discount-amount">-${discount.amount.toLocaleString()}원</div>
            </div>
            <button class="discount-remove" onclick="removeDiscount(${index})">삭제</button>
        `;
        
        appliedDiscountsContainer.appendChild(discountItem);
    });
}

// 할인 제거
function removeDiscount(index) {
    const discount = appliedDiscounts[index];
    
    // API 호출로 할인 취소
    if (discount.type === 'membership') {
        apiCall(API_CONFIG.ENDPOINTS.MEMBER_CANCEL, { method: 'POST' });
    } else if (discount.type === 'coupon') {
        apiCall(API_CONFIG.ENDPOINTS.COUPON_CANCEL, { method: 'POST' });
    }
    
    appliedDiscounts.splice(index, 1);
    renderAppliedDiscounts();
    updateTotalAmount();
}

// 결제 처리
async function processPayment() {
    const originalTotal = orderData.totalAmount;
    const discountAmount = appliedDiscounts.reduce((sum, discount) => sum + discount.amount, 0);
    const finalAmount = originalTotal - discountAmount;

    const paymentData = {
        items: orderData.items,
        paymentMethod: selectedPaymentMethod,
        totalAmount: originalTotal,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        appliedDiscounts: appliedDiscounts
    };

    const result = await apiCall(API_CONFIG.ENDPOINTS.PAYMENT_PROCESS, {
        method: 'POST',
        body: JSON.stringify(paymentData)
    });

    if (result.success) {
        alert('결제가 완료되었습니다!');
        window.location.href = 'main.html';
    } else {
        alert(result.message || '결제에 실패했습니다.');
    }
}