<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const props = defineProps({
  money: Number
})

const emit = defineEmits(['update:money', 'refresh-profile'])

const isModalOpen = ref(false)
const modalMessage = ref('')
const modalType = ref('info') // 'info', 'success', 'error'

const openModal = (message, type = 'info') => {
  modalMessage.value = message
  modalType.value = type
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

onMounted(() => {
  // 결제 성공 및 탭 이동 처리
  const urlParams = new URLSearchParams(window.location.search)
  
  // 1) 특정 탭으로 이동 (머니구매 등)
  const targetTab = urlParams.get('shopTab')
  if (targetTab && tabs.find(t => t.id === targetTab)) {
    currentTab.value = targetTab
  }

  // 2) 결제 성공 알림
  if (urlParams.get('payment') === 'success') {
    // 이제 서버(webhook)에서 안전하게 골드를 지급하므로, 
    // 프론트엔드에서는 안내 메시지만 표시합니다.
    openModal('결제가 완료되었습니다! 머니가 충전될 때까지 잠시만 기다려 주세요. ✨', 'success')
    emit('refresh-profile')

    // URL 파라미터 제거하여 다시 열릴 때 모달이 뜨지 않게 함
    const newUrl = window.location.pathname
    window.history.replaceState({}, document.title, newUrl)
  }
})

const currentTab = ref('eggs') // 'eggs', 'story', 'gold'

const tabs = [
  { id: 'eggs', label: '알부화기', icon: '🧪' },
  { id: 'story', label: '동화도우미', icon: '🪄' },
  { id: 'gold', label: '머니구매', icon: '💎' }
]

// [ID 수정] 실데이터 연결을 위해 incubator_ 전역 ID 사용
const eggItems = [
  { id: 'incubator_basic', name: '기본 부화기', price: 100, image: '🧪', desc: '평범하지만 튼튼해요' },
  { id: 'incubator_fire', name: '불꽃 부화기', price: 250, image: '🔥', desc: '불속성 알에 좋아요' },
  { id: 'incubator_water', name: '바다 부화기', price: 250, image: '💧', desc: '물속성 알에 좋아요' },
  { id: 'incubator_nature', name: '자연 부화기', price: 250, image: '🍃', desc: '풀속성 알에 좋아요' },
  { id: 'incubator_steel', name: '강철 부화기', price: 350, image: '⚙️', desc: '부화 시간을 단축해요' },
  { id: 'incubator_legendary', name: '전설 부화기', price: 800, image: '✨', desc: '희귀 드래곤 확률 업!' }
]

const storyItems = [
  { id: 'helper_pencil', name: '반짝이 연필', price: 50, image: '✏️', desc: '예쁜 문장을 추천해요' },
  { id: 'helper_magnifier', name: '상상 돋보기', price: 70, image: '🔍', desc: '새로운 소재를 발견해요' },
  { id: 'helper_feather', name: '지혜의 깃펜', price: 100, image: '🪶', desc: '어휘력이 풍부해져요' },
  { id: 'helper_fairy', name: '이야기 요정', price: 150, image: '🧚', desc: '영감을 불어넣어줘요' },
  { id: 'helper_stick', name: '황금 지팡이', price: 300, image: '🪄', desc: '환상적인 결말을 완성!' },
  { id: 'helper_library', name: '우주 도서관', price: 500, image: '🪐', desc: '무한한 이야기를 제공함' }
]

const goldItems = [
  { id: 'gold_pocket', name: '동전 한 주먹', amount: 100, price: 1200, priceLabel: '₩1,200', image: '🪙', polarProductId: '0ea422f9-1ac7-4472-a714-b16f80db09e6' },
  { id: 'gold_bag', name: '금화 주머니', amount: 500, price: 5500, priceLabel: '₩5,500', image: '💰', polarProductId: '0ea422f9-1ac7-4472-a714-b16f80db09e6' },
  { id: 'gold_box', name: '황금 상자', amount: 1200, price: 11000, priceLabel: '₩11,000', image: '📦', polarProductId: '0ea422f9-1ac7-4472-a714-b16f80db09e6' },
  { id: 'gold_treasure', name: '드래곤 보물', amount: 3500, price: 33000, priceLabel: '₩33,000', image: '💎', polarProductId: '0ea422f9-1ac7-4472-a714-b16f80db09e6' }
]

const handleBuy = async (item) => {
  if (currentTab.value === 'gold') {
    // Polar.sh 결제 연동
    try {
      const idToken = localStorage.getItem('idToken')
      if (!idToken) {
        openModal('로그인이 필요합니다.', 'error')
        return
      }

      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/payment/create-checkout`, {
        idToken: idToken,
        product_id: item.polarProductId,
        item_id: item.id
      })

      if (response.data.checkout_url) {
        // Polar 결제 페이지로 리다이렉트
        window.location.href = response.data.checkout_url
      }
    } catch (error) {
      console.error('Payment redirect error:', error)
      openModal('결제 페이지로 이동하는 중 오류가 발생했습니다.', 'error')
    }
    return
  }

  if (props.money < item.price) {
    openModal('머니가 부족합니다!', 'error')
    return
  }

  try {
    const idToken = localStorage.getItem('idToken')
    if (!idToken) {
      openModal('로그인이 필요합니다. 다시 로그인해주세요.', 'error')
      return
    }

    // [DEBUG] Request Payload 확인
    console.log('Purchase Request:', { itemId: item.id, price: item.price, idToken })

    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/shop/purchase`, {
      itemId: item.id,
      price: item.price,
      idToken: idToken // 명시적 할당
    })

    if (response.data.status === 'success') {
      openModal(`${item.name} 구매를 완료했습니다!`, 'success')
      emit('update:money', response.data.new_money)
      emit('refresh-profile') // 최신 아이템 목록 등을 위해 프로필 갱신 요청
    } else {
      openModal(response.data.message || '구매 실패', 'error')
    }
  } catch (error) {
    console.error('Purchase error:', error)
    // [수정] 상세 에러 메시지 표시
    const errorMsg = error.response?.data?.detail || error.message || '알 수 없는 오류'
    openModal(`구매 중 오류가 발생했습니다: ${errorMsg}`, 'error')
  }
}

</script>

<template>
  <div class="shop-container">
    <!-- 배경 이미지 레이어 -->
    <div class="background-overlay">
      <img src="../assets/s12.png" class="bg-img" alt="Shop Background" />
    </div>

    <div class="shop-content-wrapper">
      <!-- [NEW] 상점 내 머니 표시 (헤더 바깥, 우측 상단 고정) -->
      <div class="shop-money-badge">
        <span class="coin-icon">🪙</span>
        <span class="coin-amount">{{ money }}</span>
      </div>

      <!-- 상점 헤더 -->
      <div class="shop-header">
        <img src="../assets/s12_logo.png" class="shop-title-logo" alt="드래곤 만물상" />
      </div>

      <!-- 탭 네비게이션 -->
      <div class="shop-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab-btn"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <!-- 탭 컨텐츠 영역 -->
      <div class="shop-scroll-area">
        
        <!-- 1. 알부화기 탭 -->
        <div v-if="currentTab === 'eggs'" class="item-grid">
          <div v-for="item in eggItems" :key="item.id" class="shop-item-card">
            <div class="item-icon-box egg-bg">{{ item.image }}</div>
            <div class="item-info">
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="item-desc">{{ item.desc }}</p>
              <button class="buy-btn" @click="handleBuy(item)">
                🪙 {{ item.price }}
              </button>
            </div>
          </div>
        </div>

        <!-- 2. 동화도우미 탭 -->
        <div v-if="currentTab === 'story'" class="item-grid">
          <div v-for="item in storyItems" :key="item.id" class="shop-item-card">
            <div class="item-icon-box story-bg">{{ item.image }}</div>
            <div class="item-info">
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="item-desc">{{ item.desc }}</p>
              <button class="buy-btn" @click="handleBuy(item)">
                🪙 {{ item.price }}
              </button>
            </div>
          </div>
        </div>

        <!-- 3. 머니구매 탭 -->
        <div v-if="currentTab === 'gold'" class="item-grid gold-grid">
          <div v-for="item in goldItems" :key="item.id" class="shop-item-card gold-card">
            <div class="item-icon-box gold-bg">{{ item.image }}</div>
            <div class="item-info">
              <h3 class="item-name">{{ item.name }}</h3>
              <p class="gold-amount">+ {{ item.amount }} G</p>
              <button class="buy-btn real-money" @click="handleBuy(item)">
                {{ item.priceLabel }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- [NEW] 알림 모달 -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3 class="modal-title">
          {{ modalType === 'error' ? '오류' : (modalType === 'success' ? '성공' : '알림') }}
        </h3>
        <p class="modal-message" :class="modalType">{{ modalMessage }}</p>
        <button class="modal-close-btn" @click="closeModal">확인</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.background-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shop-content-wrapper {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 80px 20px 100px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.2); /* 배경색 투명하게 */
  backdrop-filter: blur(2px); /* 약간의 블러 효과 */
}

/* 상점 헤더 */
.shop-header {
  margin-bottom: 25px;
  text-align: center;
  /* 헤더 내 요소 세로 정렬 */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.shop-money-badge {
  /* MainLobby와 유사하게 우측 상단 절대 배치 또는 flex로 분리 */
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 15px;
  border-radius: 20px;
  border: 2px solid #ffca28;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  z-index: 10; /* 헤더보다 위에 표시 */
}

/* 모바일 등 좁은 화면 대응 */
@media (max-width: 480px) {
  .shop-money-badge {
    top: 15px;
    right: 15px;
    padding: 4px 10px;
  }
}

.coin-icon { font-size: 1.2rem; }
.coin-amount { 
  font-weight: 800; 
  color: #ff8f00; 
  font-size: 1.1rem;
}

.shop-title-logo {
  height: 160px; /* 로고 크기 대폭 확대 */
  width: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
  margin-bottom: 20px;
}

.shop-desc {
  color: #6d4c41;
  font-size: 0.95rem;
  font-weight: 500;
}

/* 탭 스타일 */
.shop-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 25px;
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 15px;
  border-radius: 18px;
  border: 2px solid rgba(255,255,255,0.8);
  background: rgba(255, 255, 255, 0.5);
  color: #7d6b67;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  flex: 1;
  max-width: 100px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
}

.tab-btn.active {
  background: #ffffff;
  border-color: #ff9800;
  color: #e65100;
  box-shadow: 0 8px 15px rgba(255, 152, 0, 0.25);
  transform: translateY(-5px);
}

.tab-icon {
  font-size: 1.5rem;
}

.tab-label {
  font-size: 0.85rem;
}

/* 스크롤 영역 */
.shop-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 5px;
}

/* [NEW] 알림 모달 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 20px;
  width: 90%;
  max-width: 320px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: scaleUp 0.3s ease;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: #3e2723;
  margin-bottom: 10px;
}

.modal-message {
  font-size: 1rem;
  color: #5d4037;
  margin-bottom: 20px;
  line-height: 1.5;
  word-break: keep-all;
}

.modal-message.error {
  color: #d32f2f;
}

.modal-message.success {
  color: #388e3c;
}

.modal-close-btn {
  background: #ffca28;
  color: #5d4037;
  border: none;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: 0 3px 0 #ffa000;
  transition: transform 0.1s;
}

.modal-close-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #ffa000;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* 그리드 레이아웃 */
.item-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  width: 100%;
}

@media (min-width: 600px) {
  .item-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 아이템 카드 스타일 */
.shop-item-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 25px;
  padding: 20px 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 20px rgba(0,0,0,0.08);
  transition: all 0.3s ease;
  border: 2px solid rgba(255,255,255,0.5);
}

.shop-item-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.12);
  border-color: #ffccbc;
}

.item-icon-box {
  width: 70px;
  height: 70px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  margin-bottom: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.egg-bg { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
.story-bg { background: linear-gradient(135deg, #f3e5f5, #e1bee7); }
.gold-bg { background: linear-gradient(135deg, #fff8e1, #ffecb3); }

.item-info {
  text-align: center;
  width: 100%;
}

.item-name {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #3e2723;
}

.item-desc {
  margin: 6px 0 14px;
  font-size: 0.8rem;
  color: #795548;
  height: 1.2rem;
  line-height: 1.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gold-amount {
  font-size: 1.1rem;
  font-weight: 900;
  color: #ff9800;
  margin-bottom: 10px;
}

.buy-btn {
  width: 100%;
  padding: 10px 0;
  border-radius: 15px;
  border: none;
  background-color: #ffca28;
  color: #5d4037;
  font-weight: 800;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 0 #ffa000;
}

.buy-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 #ffa000;
}

.buy-btn.real-money {
  background-color: #81c784;
  color: #1b5e20;
  box-shadow: 0 4px 0 #4caf50;
}

.buy-btn.real-money:active {
  box-shadow: 0 2px 0 #4caf50;
}

/* 스크롤바 숨기기 */
.shop-scroll-area::-webkit-scrollbar {
  display: none;
}
.shop-scroll-area {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
