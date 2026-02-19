<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue' // [추가] 에너지 시스템을 위한 반응형 변수와 생명주기 훅
import CollectionView from './CollectionView.vue'
import Shop from './Shop.vue'
import StoryTeller from './StoryTeller.vue'
import ReportView from './ReportView.vue'
import CommunityView from './CommunityView.vue'
import axios from 'axios' // [NEW] axios 추가

// 배경 이미지 임포트
import s02Bg from '../assets/s02.png'
import s10Bg from '../assets/s10_bg.png'
import s13Bg from '../assets/s13.png'

const props = defineProps({
  energy: Number,
  money: { type: Number, default: 0 },
  userItems: { type: Object, default: () => ({}) }, // [NEW] 보유 아이템
  timerText: String,
  idToken: String,
  forceOpenModal: Boolean,
  initialTab: String,
  initialDragon: Object
})

const emit = defineEmits(['start-generation', 'modal-opened', 'use-energy', 'recharge-energy', 'tab-reset', 'update:money', 'refresh-profile'])

// 현재 선택된 탭 관리 ('만들기', '도감', '상점', '동화', '보고서', '커뮤니티')
const activeTab = ref(props.initialTab || '만들기')
const selectedDragonForStory = ref(props.initialDragon || null)
const reportBannerOpen = ref(false)

// 모달창의 표시 여부
const showModal = ref(false)

// [수정] 사용자가 입력하는 텍스트 (단순 입력창용)
const userInput = ref('')

// [NEW] 현재 모달 세션이 에너지 소모 세션인지 재시도 세션인지 관리
const isRetrySession = ref(false)
const selectedItemId = ref(null) // [NEW] 선택된 아이템 ID

// [NEW] 광고 모달 상태
const showAdModal = ref(false)
const adTimer = ref(3)
const adTimerInterval = ref(null)

const maxEnergy = 5

// [NEW] 컴포넌트 마운트 시 강제 오픈 여부 확인
onMounted(() => {
  if (props.forceOpenModal) {
    showModal.value = true
    isRetrySession.value = true // [NEW] 강제 오픈은 재시도 세션이므로 무료
    // 부모에게 처리가 되었음을 알림
    emit('modal-opened')
  }
  
  if (props.initialTab) {
    activeTab.value = props.initialTab
  }
  if (props.initialDragon) {
    selectedDragonForStory.value = props.initialDragon
  }
})

// 모달창을 닫는 함수
const closeModal = () => {
  showModal.value = false
}

// [NEW] 입력 내용을 모두 지우고 다시 쓰는 함수
const resetInput = () => {
  userInput.value = ''
  selectedItemId.value = null
}

// [NEW] 줄바꿈이 포함된 플레이스홀더 텍스트
const placeholderText = "여기에 내용을 작성하세요\n구체적이고 자세하게!!!"


// [NEW] 입력을 완료하고 모달을 닫는 함수
const submitInput = () => {
  if (userInput.value.trim() !== '') {
    // [수정] 신규 세션일 때만 에너지 체크, 재시도 세션이면 항상 통과
    if (isRetrySession.value || props.energy > 0) {
      // [NEW] 부모 컴포넌트에 생성 시작 신호와 함께 입력값 및 재시도 여부 전달
      emit('start-generation', userInput.value, isRetrySession.value, selectedItemId.value)
      
      // 모달 닫기 및 입력값 초기화
      showModal.value = false
      userInput.value = ''
      selectedItemId.value = null // [NEW] 아이템 초기화
    } else {
      alert('에너지가 부족합니다! 10분마다 충전되니 조금만 기다려 주세요.')
    }
  } else {
    alert('드래곤에게 전달할 내용을 입력해 주세요!')
  }
}

// [NEW] 신규 탐험 버튼 클릭 시 처리
const openNewCreationModal = () => {
  isRetrySession.value = false // 신규 탐험이므로 에너지 소모됨
  showModal.value = true
}

// [NEW] 도감 상세 모달 상태 관리 (하단바 숨기기용)
const isDetailModalOpen = ref(false)
const handleDetailModalState = (isOpen) => {
  isDetailModalOpen.value = isOpen
}

// [NEW] 동화 읽기 시작 핸들러
const handleReadStory = (dragon) => {
  selectedDragonForStory.value = dragon
  activeTab.value = '동화'
  isDetailModalOpen.value = false // 모달 닫기 확인
}

// [NEW] 광고 시작 함수
const startAd = () => {
  showAdModal.value = true
  adTimer.value = 3
  
  adTimerInterval.value = setInterval(() => {
    adTimer.value--
    if (adTimer.value <= 0) {
      clearInterval(adTimerInterval.value)
      completeAd()
    }
  }, 1000)
}

// [NEW] 광고 완료 처리
const completeAd = async () => {
  try {
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/energy/ad-reward`, {
       idToken: props.idToken
    })
    
    alert(`에너지가 충전되었습니다! 현재: ${response.data.energy}`)
    // [수정] 에너지 충전 이벤트 발생 (App.vue에서 fetchUserProfile 호출)
    emit('recharge-energy')
    
  } catch (error) {
    console.error('광고 보상 오류:', error)
    alert('에너지 충전에 실패했습니다.')
  } finally {
    showAdModal.value = false
  }
}

// [NEW] 아이템 정보 (아이콘 매칭용)
const itemData = {
  'incubator_basic': { name: '기본 부화기', icon: '🧪' },
  'incubator_fire': { name: '불꽃 부화기', icon: '🔥' },
  'incubator_water': { name: '바다 부화기', icon: '💧' },
  'incubator_nature': { name: '자연 부화기', icon: '🍃' },
  'incubator_steel': { name: '강철 부화기', icon: '⚙️' },
  'incubator_legendary': { name: '전설 부화기', icon: '✨' }
}

const toggleItem = (id) => {
  if (selectedItemId.value === id) {
    selectedItemId.value = null
  } else {
    selectedItemId.value = id
  }
}

// [NEW] 현재 탭에 따른 배경 이미지 결정
const currentBg = computed(() => {
  if (activeTab.value === '커뮤니티') return s13Bg
  return s02Bg
})

// [NEW] 음성 인식 (STT) 로직 - Web Speech API
const isListening = ref(false)
let recognition = null

const startListening = () => {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('이 브라우저는 음성 인식을 지원하지 않습니다. 크롬 브라우저를 사용해보세요!')
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = 'ko-KR' // 한국어 설정
  recognition.interimResults = false 
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    isListening.value = true
  }

  recognition.onend = () => {
    isListening.value = false
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    if (userInput.value) {
      userInput.value += ' ' + transcript
    } else {
      userInput.value = transcript
    }
    
    // [NEW] 음성 인식이 끝나면 자동으로 '완료' 버튼 누른 것 처럼 평가 진행
    setTimeout(() => {
      submitInput()
    }, 500) // 0.5초 대기 후 전송 (사용자가 입력된 텍스트를 잠시 볼 수 있게)
  }

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error)
    isListening.value = false
    if (event.error === 'not-allowed') {
      alert('마이크 사용 권한이 필요합니다 설정에서 허용해주세요.')
    }
  }

  recognition.start()
}
</script>

<template>
  <div class="main-container">
    <!-- 배경 고정 -->
    <div class="background-container">
      <img :src="currentBg" class="background-img" alt="Background" />
    </div>

    <!-- 좌상단 로고 배너 -->
    <div v-if="activeTab === '만들기'" class="top-logo-banner">
      <div class="logo-circle">
        <img src="../assets/s02_logo_icon.png" alt="Dragon Icon" class="mini-dragon" />
      </div>
      <div class="logo-text">
        <span class="text-top">드래곤</span>
        <span class="text-bottom">아일랜드</span>
      </div>
    </div>

    <!-- [NEW] 상단 우측 UI 레이어 (에너지 + 재화) -->
    <div v-if="activeTab === '만들기'" class="top-right-ui-container">
      <div class="energy-status-bar">
        <div class="energy-icon-wrapper">
          <span class="energy-icon">⚡</span>
          <span class="energy-count">{{ energy }} / {{ maxEnergy }}</span>
          <!-- [NEW] 광고 보고 에너지 충전 버튼 -->
          <button class="charge-btn" @click="startAd" v-if="energy < maxEnergy">
            +
          </button>
        </div>
        
        <!-- 충전 중일 때만 남은 시간을 보여줍니다. -->
        <div class="timer-display" v-if="energy < maxEnergy">
          {{ timerText }} 내 충전
        </div>
      </div>

      <!-- 재화 표시 -->
      <div class="money-badge">
        <span class="money-icon">🪙</span>
        <span class="money-amount">{{ money }}</span>
      </div>
    </div>
    
    <!-- 1. 만들기 (기본 로비) 화면 -->
    <div v-if="activeTab === '만들기'" class="content">
      <img src="../assets/s02_main.png" class="center-img" alt="Main Content" />
      
      <!-- [수정] 클릭 시 신규 탐험 모드로 모달 오픈 -->
      <button class="voice-create-btn" @click="openNewCreationModal">
        <span class="mic-icon">⌨️</span>
        <span class="btn-text">드래곤 만나러 가기</span>
      </button>
    </div>

    <!-- 2. 도감 화면 -->
    <CollectionView 
      v-else-if="activeTab === '도감'" 
      :idToken="idToken" 
      @modal-state-change="handleDetailModalState"
      @read-story="handleReadStory"
    />

    <!-- 3. 상점 화면 -->
    <Shop 
      v-else-if="activeTab === '상점'" 
      :money="money"
      @update:money="emit('update:money', $event)"
      @refresh-profile="emit('refresh-profile')"
    />

    <!-- 4. 보고서 화면 -->
    <ReportView 
      v-else-if="activeTab === '보고서'" 
      :idToken="idToken"
      @banner-open="reportBannerOpen = true"
      @banner-close="reportBannerOpen = false"
    />

    <!-- 5. 커뮤니티 화면 -->
    <CommunityView 
      v-else-if="activeTab === '커뮤니티'" 
      :idToken="idToken"
      @modal-state-change="handleDetailModalState"
    />

    <!-- 6. 동화 화면 -->
    <StoryTeller 
      v-else-if="activeTab === '동화'" 
      :idToken="idToken"
      :selectedDragon="selectedDragonForStory"
      :energy="energy"
      :userItems="userItems"
      @go-home="activeTab = '만들기'"
      @go-encyclopedia="activeTab = '도감'"
      @use-energy="emit('use-energy')"
    />

    <!-- 하단 네비게이션 바 -->
    <div class="bottom-nav" :class="{ hidden: isDetailModalOpen || activeTab === '동화' || reportBannerOpen }">
      <div class="nav-item" :class="{ active: activeTab === '만들기' }" @click="activeTab = '만들기'">
        <div class="icon-wrapper">🔨</div>
        <span class="nav-label">만들기</span>
      </div>
      <div class="nav-item" :class="{ active: activeTab === '도감' || activeTab === '동화' }" @click="activeTab = '도감'">
        <div class="icon-wrapper">📖</div>
        <span class="nav-label">도감</span>
      </div>
      <div class="nav-item" :class="{ active: activeTab === '상점' }" @click="activeTab = '상점'">
        <div class="icon-wrapper">🎁</div>
        <span class="nav-label">상점</span>
      </div>
      <div class="nav-item" :class="{ active: activeTab === '보고서' }" @click="activeTab = '보고서'">
        <div class="icon-wrapper">🗒️</div>
        <span class="nav-label">보고서</span>
      </div>
      <div class="nav-item" :class="{ active: activeTab === '커뮤니티' }" @click="activeTab = '커뮤니티'">
        <div class="icon-wrapper">🌏</div>
        <span class="nav-label">커뮤니티</span>
      </div>
    </div>

    <!-- [수정] 텍스트 입력 전용 모달 레벨 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <!-- 상단 구름 장식 -->
        <div class="modal-header-cloud">
          <button class="close-x-btn" @click="closeModal">&times;</button>
        </div>

        <div class="modal-body">
          <!-- [NEW] 상단 알록달록한 보이스 웨이브 애니메이션 + 녹음 버튼 -->
          <div class="voice-wave-visual">
            <div class="wave-line"></div>
            <div class="wave-line"></div>
            <div class="wave-line"></div>
            <div class="wave-line"></div>
            <div class="wave-line"></div>
            
            <!-- [NEW] 녹음 버튼 (일렁이는 막대 옆으로 이동) -->
            <button 
              class="record-btn-large" 
              :class="{ listening: isListening }"
              @click="startListening"
            >
              <span class="mic-emoji">🎙️</span>
              <span class="record-text">{{ isListening ? '듣고 있어요...' : '눌러서 말하기' }}</span>
            </button>
          </div>

          <!-- 중앙 아이콘/설명 영역 -->
          <div class="input-intro">
            <p class="intro-text">원하는 드래곤을 말해보세요!</p>
          </div>

          <!-- [핵심] 텍스트 입력 영역 -->
          <div class="text-input-container">
            <textarea 
              v-model="userInput" 
              :placeholder="placeholderText"
              class="custom-textarea"
              rows="4"
            ></textarea>
          </div>

          <!-- 입력 전송 버튼 -->
          <div class="modal-footer">
            <!-- [NEW] 아이템 선택 영역 -->
            <div v-if="!isRetrySession" class="item-selection-area">
              <p class="section-title">✨ 부화기 아이템 사용 (선택)</p>
              <div class="item-list-horizontal">
                <!-- 모든 부화기 아이콘을 항상 노출 (수량 0이면 비활성화) -->
                <div 
                  v-for="(data, id) in itemData" 
                  :key="id"
                  class="item-chip"
                  :class="{ 
                    active: selectedItemId === id,
                    disabled: (props.userItems[id] || 0) <= 0 
                  }"
                  @click="(props.userItems[id] || 0) > 0 ? toggleItem(id) : null"
                >
                  <span class="chip-icon">{{ data.icon }}</span>
                  <div class="chip-info">
                    <span class="chip-label">{{ data.name }}</span>
                    <span class="chip-qty">x{{ props.userItems[id] || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="button-group">
              <button class="retry-btn" @click="resetInput">다시 작성</button>
              <button class="finish-btn" @click="submitInput">완료</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- [NEW] 광고 모달 -->
    <div v-if="showAdModal" class="modal-overlay ad-overlay">
      <div class="ad-content">
        <h3>광고 시청 중...</h3>
        <div class="ad-timer">{{ adTimer }}</div>
        <p>잠시만 기다려주세요!</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* [NEW] 우측 상단 UI 컨테이너 (에너지 + 재화 통합 관리) */
.top-right-ui-container {
  position: absolute;
  top: 60px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end; /* 오른쪽 정렬 */
  gap: 10px;
  z-index: 100;
}

.energy-status-bar {
  background-color: rgba(255, 255, 255, 0.9);
  padding: 8px 15px;
  border-radius: 20px;
  box-shadow: 2px 4px 10px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px solid #ffcc00;
  width: fit-content;
}

.energy-icon-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.energy-icon {
  font-size: 1.2rem;
  color: #ffcc00;
}

.energy-count {
  font-weight: bold;
  font-size: 1rem;
  color: #333;
}

.timer-display {
  font-size: 0.75rem;
  color: #888;
  margin-top: 2px;
}

.charge-btn {
  background: linear-gradient(135deg, #ffecb3, #ffd54f);
  border: none;
  color: #f57f17;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  animation: pulseCharge 2s infinite;
  margin-left: 2px;
  padding-bottom: 2px; /* + 기호 위치 조정 */
}

.charge-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(255, 213, 79, 0.4);
}

.charge-btn:active {
  transform: scale(0.95);
}

@keyframes pulseCharge {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 213, 79, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(255, 213, 79, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 213, 79, 0); }
}

/* 화면 전체를 감싸는 컨테이너 */
.main-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

/* 배경 고정 */
.background-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.background-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 좌상단 로고 배너 스타일 */
.top-logo-banner {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  background-color: white;
  padding: 8px 15px;
  border-radius: 0 50px 50px 0; /* 오른쪽만 둥글게 */
  box-shadow: 2px 4px 10px rgba(0, 0, 0, 0.1);

  /* [수정 가능] 여백 설정 */
  top: 60px;   /* 위쪽 여백: 숫자를 키우면 더 아래로 내려갑니다 */
  left: 0;     /* 왼쪽 여백: 0이면 왼쪽 벽에 딱 붙습니다 */
}

.logo-circle {
  width: 50px;
  height: 50px;
  background-color: #e1f5fe;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
  overflow: hidden;
  border: 2px solid #fff;
}

.mini-dragon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.text-top {
  font-size: 14px;
  font-weight: bold;
  color: #fbc02d; /* 금색 계열 */
  text-shadow: 1px 1px 0 #fff;
}

/* [NEW] 재화 배지 스타일 */
.money-badge {
  display: flex;
  align-items: center;
  background-color: #fff8e1;
  padding: 5px 12px;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  border: 2px solid #ffecb3;
  width: fit-content;
}

.money-icon {
  font-size: 1.2rem;
  margin-right: 5px;
}

.money-amount {
  font-weight: bold;
  color: #f57f17;
  font-size: 1rem;
}

.text-bottom {
  font-size: 18px;
  font-weight: 900;
  color: #4db6ac; /* 민트 계열 */
  text-shadow: 1px 1px 0 #fff;
}

/* 중앙 정렬을 위한 콘텐츠 컨테이너 */
.content {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column; /* 세로로 쌓기 */
  justify-content: center; /* 가로 중앙 */
  align-items: center;     /* 세로 중앙 */
}

/* 중앙 이미지 스타일 */
.center-img {
  width: 70vw; /* 화면 너비의 70%로 유연하게 조절 */
  max-width: 400px; /* 너무 커지는 것 방지 */
  min-width: 250px; /* 너무 작아지는 것 방지 */
  height: auto;
  /* 살짝 그림자를 주어 배경과 분리되게 할 수도 있습니다 */
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
  
  /* 반짝거리는 애니메이션 적용 */
  animation: sparkle 2s infinite ease-in-out;
}

/* 반짝거리는(글로우) 애니메이션 정의 + 위치 이동 */
@keyframes sparkle {
  0%, 100% {
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.4)) drop-shadow(0 4px 10px rgba(0,0,0,0.3));
    /* translateY(-50px)를 추가하여 위로 올립니다. */
    transform: translateY(20px) scale(1);
  }
  50% {
    filter: drop-shadow(0 0 25px rgba(255, 255, 255, 0.8)) drop-shadow(0 4px 15px rgba(0,0,0,0.4));
    /* 위치를 유지하면서 살짝 커지게 합니다. */
    transform: translateY(20px) scale(1.02);
  }
}
/* 드래곤 만나러 가기 버튼 스타일 */
.voice-create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #a5c3f6; /* 부드러운 하늘색 */
  color: white;
  border: none;
  border-radius: 50px; /* 둥근 형태 */
  
  /* 너비와 높이를 유연하게 설정 */
  width: 70vw;
  max-width: 300px;
  padding: 18px 0; /* 좌우 패딩 대신 너비를 고정하고 상하만 조절 */
  
  margin-top: 50px; 
  font-size: 1.2rem; /* 상대적인 글자 크기 단위 사용 */
  font-weight: bold;
  cursor: pointer;
  
  /* 외부 그림자와 내부 그림자(inset)를 동시에 적용 */
  box-shadow: 
    0 4px 15px rgba(0, 0, 0, 0.1), 
    inset 0 -4px 6px rgba(0, 0, 0, 0.1), /* 하단 안쪽 어두운 그림자 */
    inset 0 4px 6px rgba(255, 255, 255, 0.4); /* 상단 안쪽 밝은 하이라이트 */
    
  transition: transform 0.2s, background-color 0.2s, box-shadow 0.2s;
  z-index: 2;
}

.voice-create-btn:hover {
  background-color: #8fb1ea;
  /* translateY를 지우고 scale만 남깁니다 */
  transform: scale(1.05); 
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15), inset 0 -2px 4px rgba(0, 0, 0, 0.1);
}

.voice-create-btn:active {
  background-color: #e97551ff; 
  /* 여기도 translateY를 지웁니다 */
  transform: scale(0.98); 
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1), inset 0 4px 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.1s, background-color 0.1s;
}

.mic-icon {
  margin-right: 10px;
  font-size: 20px;
}

.btn-text {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 하단 네비게이션 바 스타일 */
.bottom-nav {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 90px;
  background-color: white;
  display: flex;
  justify-content: space-around;
  align-items: center;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.05);
  z-index: 10;
  padding-bottom: 10px; /* 아이폰 하단 바 고려 */
  transition: transform 0.3s ease, opacity 0.3s ease;
}

/* [NEW] 모달 오픈 시 하단바 숨김 클래스 */
.bottom-nav.hidden {
  display: none !important; /* 확실하게 제거 */
  transform: translateY(100%);
  opacity: 0;
  pointer-events: none;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 80px;
  height: 100%;
}

.icon-wrapper {
  font-size: 28px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.nav-label {
  font-size: 13px;
  font-weight: bold;
  color: #888;
}

/* 활성화된 아이템(만들기) 스타일 */
.nav-item.active .icon-wrapper {
  background-color: #d1e8f7; /* 이미지 속 연한 하늘색 배경 */
}

.nav-item.active .nav-label {
  color: #555;
}

/* ---------------------------------------------------- */
/* [수정] 입력전용 모달창 스타일 */
/* ---------------------------------------------------- */

/* 배경을 어둡게 만드는 레이어 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); /* 반투명 검은색 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  backdrop-filter: blur(5px); /* 배경 흐리게 */
}

/* 모달 본체 박스 */
.modal-content {
  position: relative;
  width: 90vw;
  max-width: 380px;
  /* height: 70vh; 채팅창이므로 세로 길이를 충분히 확보 */
  background-color: white;
  border-radius: 35px;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 테두리 밖 내용 숨김 */
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  /* 모바일 키보드 대응: 위로 살짝 띄워줌 */
  transform: translateY(-30px); 
}

/* 상단 구름 장식 효과 */
.modal-header-cloud {
  height: 45px;
  background: #f9fbfd;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 15px;
  color: #888;
}

.modal-title {
  font-weight: bold;
  font-size: 16px;
}

.close-x-btn {
  background: none;
  border: none;
  color: #ccc;
  font-size: 32px;
  font-weight: 200;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
  line-height: 1;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-x-btn:hover {
  color: #888;
  transform: rotate(90deg);
}

.modal-body {
  padding: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f9fbfd;
}

/* [NEW] 알록달록 보이스 웨이브 스타일 */
.voice-wave-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 60px;
  margin-bottom: 20px;
  width: 100%;
}

.wave-line {
  width: 6px;
  height: 20px;
  border-radius: 10px;
  background: linear-gradient(to bottom, #ff9aef, #ffef9a, #9afff2);
  animation: wavePulse 1.5s infinite ease-in-out;
}

/* 각 막대마다 애니메이션 속도와 높이를 다르게 주어 리듬감 부여 */
.wave-line:nth-child(1) { animation-delay: 0.1s; height: 30px; }
.wave-line:nth-child(2) { animation-delay: 0.3s; height: 50px; }
.wave-line:nth-child(3) { animation-delay: 0.2s; height: 40px; }
.wave-line:nth-child(4) { animation-delay: 0.4s; height: 55px; }
.wave-line:nth-child(5) { animation-delay: 0.1s; height: 35px; }

@keyframes wavePulse {
  0%, 100% { transform: scaleY(1); opacity: 0.6; }
  50% { transform: scaleY(1.5); opacity: 1; }
}

/* 중앙 아이콘/설명 영역 */
.input-intro {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}
.mic-char {
  font-size: 24px;
}
.intro-text {
  font-weight: bold;
  color: #555;
  font-size: 1.1rem;
}

/* 텍스트 입력창 컨테이너 */
.text-input-container {
  width: 100%;
  margin-bottom: 25px;
  position: relative; /* [NEW] 마이크 버튼 배치를 위해 */
}

.custom-textarea {
  width: 100%;
  border: 2px solid #e5e7eb;
  border-radius: 15px;
  padding: 15px;
  font-size: 1rem;
  outline: none;
  resize: none; /* 크기 조절 비활성화 */
  background-color: #fafafa;
  transition: border-color 0.2s;
  box-sizing: border-box; /* 패딩이 너비에 포함되도록 */
  padding-right: 45px; /* 마이크 버튼 공간 확보 */
}

.custom-textarea:focus {
  border-color: #f3f3f3ff;
}

/* 하단 버튼 영역 */
.modal-footer {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.item-selection-area {
  background: rgba(255, 255, 255, 0.5);
  padding: 15px;
  border-radius: 20px;
  border: 1px dashed #ffa000;
}

.section-title {
  margin: 0 0 10px;
  font-size: 0.9rem;
  font-weight: 800;
  color: #e65100;
}

.item-list-horizontal {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 5px 0;
}

.item-list-horizontal::-webkit-scrollbar {
  display: none;
}

.item-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: white;
  border: 2px solid #eee;
  border-radius: 15px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.03);
}

.item-chip.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(1);
  background: #f9f9f9;
}

.item-chip.active {
  background: #fff8e1;
  border-color: #ff9800;
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(255, 152, 0, 0.2);
}

.chip-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.item-chip.active .chip-label {
  color: #e65100;
  font-weight: 800;
}

.chip-icon { font-size: 1.5rem; }
.chip-label { font-size: 0.8rem; color: #555; font-weight: 700; }
.chip-qty { 
  font-size: 0.7rem; 
  color: #ff9800;
  font-weight: 800;
}

.no-items {
  font-size: 0.85rem;
  color: #999;
  font-style: italic;
  padding: 10px 0;
}

.button-group {
  display: flex;
  gap: 10px;
}

.retry-btn, .finish-btn {
  flex: 1;
  padding: 16px 0;
  border-radius: 30px;
  border: none;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s, background-color 0.2s;
}

/* 다시 녹음(작성) 버튼 - 주황/노랑 계열 */
.retry-btn {
  background-color: #ffe0b2;
  color: #fb8c00;
}

/* 완료 버튼 - 하늘색 계열 */
.finish-btn {
  background-color: #81d4fa;
  color: white;
}

.retry-btn:active, .finish-btn:active {
  transform: scale(0.96);
}

/* [NEW] 일렁이는 막대 옆 큰 녹음 버튼 스타일 (프리미엄 디자인) */
.voice-wave-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 25px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 25px;
  border: 2px solid rgba(125, 160, 255, 0.1);
}

.record-btn-large {
  display: flex;
  flex-direction: row; /* 가로 배열 */
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: white;
  border: none;
  border-radius: 50px; /* 알약 형태 */
  padding: 12px 28px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 20px rgba(125, 160, 255, 0.15);
  outline: none;
}

.mic-emoji {
  font-size: 1.5rem;
}

.record-text {
  font-size: 1rem;
  font-weight: 800;
  color: #7DA0FF;
  letter-spacing: -0.5px;
}

.record-btn-large:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 25px rgba(125, 160, 255, 0.25);
  background: #f8faff;
}

.record-btn-large.listening {
  background: #ff6b6b;
  box-shadow: 0 8px 25px rgba(255, 107, 107, 0.4);
  animation: pulseLarge 1.5s infinite;
}

.record-btn-large.listening .record-text {
  color: white;
}

.record-btn-large:active {
  transform: translateY(0);
}

@keyframes pulseLarge {
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.6); }
  70% { box-shadow: 0 0 0 15px rgba(255, 107, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}
</style>