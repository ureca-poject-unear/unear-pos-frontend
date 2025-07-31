// API 설정
const API_CONFIG = {
  BASE_URL: 'https://dev.unear.site/api/pos',
  ENDPOINTS: {
    // 인증
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',

    // 결제
    PAYMENT_PROCESS: '/payment/process',
    PAYMENT_HISTORY: '/payment/history/place',

    // 멤버십
    MEMBER_VERIFY: '/membership/verify',
    MEMBER_APPLY: '/membership/apply',
    MEMBER_CANCEL: '/membership/cancel',

    // 쿠폰
    COUPON_VERIFY: '/coupon/verify',
    COUPON_APPLY: '/coupon/apply',
    COUPON_CANCEL: '/coupon/cancel',
  },
};

// 세션 정보 저장소
let posSessionInfo = null;

// 세션 정보 관리 함수들
const SessionManager = {
  set: (sessionInfo) => {
    posSessionInfo = sessionInfo;
    localStorage.setItem('posSessionInfo', JSON.stringify(sessionInfo));
  },

  get: () => {
    if (!posSessionInfo) {
      const stored = localStorage.getItem('posSessionInfo');
      posSessionInfo = stored ? JSON.parse(stored) : null;
    }
    return posSessionInfo;
  },

  clear: () => {
    posSessionInfo = null;
    localStorage.removeItem('posSessionInfo');
  },

  isLoggedIn: () => {
    return SessionManager.get() !== null;
  },
};

// 수정된 API 호출 함수
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;

  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    console.log('🔄 API 요청:', url, mergedOptions);
    const response = await fetch(url, mergedOptions);

    console.log('📡 응답 상태:', response.status, response.statusText);

    const text = await response.text();
    console.log('📝 응답 텍스트:', text);

    const data = text ? JSON.parse(text) : null;

    return {
      success: data?.code === 'SUCCESS',
      data: data?.data || null,
      message: data?.message || '요청 실패',
      status: response.status,
      code: data?.code,
    };
  } catch (error) {
    console.error('❌ API 호출 오류:', error);
    console.error('🔥 fetch 요청 자체가 실패함:', error);
    return {
      success: false,
      error: error.message,
      status: 0,
    };
  }
};

// 로그아웃 함수
const logout = async () => {
  const res = await apiCall(API_CONFIG.ENDPOINTS.LOGOUT, {
    method: 'POST',
  });

  if (res.success) {
    SessionManager.clear();
  }

  return res;
};
