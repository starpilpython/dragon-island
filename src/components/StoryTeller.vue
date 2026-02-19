<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import StoryEvaluation from './StoryEvaluation.vue'
import StoryFeedback from './StoryFeedback.vue'
import StoryLibrary from './StoryLibrary.vue'
import { auth } from '../firebase'

const props = defineProps({
  selectedDragon: { type: Object, required: true },
  idToken: { type: String, required: true },
  energy: { type: Number, default: 5 },
  userItems: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['use-energy'])

// 상태 관리
const userPrompt = ref('')
const isLoading = ref(false)
const evaluationResult = ref(null) // 성공 결과
const showFeedbackModal = ref(false) // 실패(피드백) 모달
const feedbackData = ref(null)
const showLibrary = ref(false) // [NEW] 동화 모음집 모달 토글
const libraryKey = ref(0) // 동화 저장 후 라이브러리 강제 새로고침용

// [NEW] 아이템 선택 관련 상태
const selectedItemId = ref(null)
const showItemModal = ref(false)

// 동화 도우미 아이템 정의 (Shop.vue와 동일)
const helperItems = [
  { id: 'helper_pencil', name: '반짝이 연필', image: '✏️', desc: '예쁜 문장을 추천해요' },
  { id: 'helper_magnifier', name: '상상 돋보기', image: '🔍', desc: '새로운 소재를 발견해요' },
  { id: 'helper_feather', name: '지혜의 깃펜', image: '🪶', desc: '어휘력이 풍부해져요' },
  { id: 'helper_fairy', name: '이야기 요정', image: '🧚', desc: '영감을 불어넣어줘요' },
  { id: 'helper_stick', name: '황금 지팡이', image: '🪄', desc: '환상적인 결말을 완성!' },
  { id: 'helper_library', name: '우주 도서관', image: '🪐', desc: '무한한 이야기를 제공함' }
]

const userHelpers = computed(() => {
  return helperItems.map(item => ({
    ...item,
    quantity: props.userItems[item.id] || 0
  }))
})

const selectedItem = computed(() => {
  return helperItems.find(it => it.id === selectedItemId.value) || null
})

const onStorySaved = () => {
  libraryKey.value++ // key 변경으로 StoryLibrary 재마운트 → fetchStories 재실행
}

const examples = [
  "'깊은 숲'속에서 '빨간 사과'를 '아주 맛있게' 먹어",
  "'바닷속'에서 '진주'를 '반짝거리게' 닦아줘",
  "'밤하늘'에서 '별똥별'을 '빠르게' 쫓아가보자"
]
const currentExampleIndex = ref(0)

const promptStatus = computed(() => {
  const text = userPrompt.value.trim()
  if (text.length === 0) return { type: 'empty', msg: '' }
  // [최종 수정] 2글자 이상이면 무조건 통과! 
  if (text.length < 2) return { type: 'bad', msg: '🧐 이야기가 너무 짧아! 조금 더 길게 말해줄래?' }
  
  return { type: 'good', msg: '✨ 멋진 이야기야! 바로 시작해보자!' }
})

const currentPlaceholder = computed(() => {
  return `누가, 어디서, 어떻게?\n예: ${examples[currentExampleIndex.value]}`
})

let timer = null
onMounted(() => {
  timer = setInterval(() => {
    currentExampleIndex.value = (currentExampleIndex.value + 1) % examples.length
  }, 4000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const submitPrompt = async () => {
  if (promptStatus.value.type !== 'good' || isLoading.value) return
  if (props.energy <= 0) {
    alert('에너지가 부족해요! 잠시 후 다시 시도해주세요. ⚡')
    return
  }
  
  isLoading.value = true
  try {
    const user = auth.currentUser
    if (!user) {
      alert('로그인이 필요합니다.')
      isLoading.value = false
      return
    }
    
    // 토큰 갱신
    const freshToken = await user.getIdToken(true)
    
    // [변경] 에너지는 성공 시 차감하므로 여기서는 호출하지 않음
    
    const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/generate`, {
      prompt: userPrompt.value,
      dragon_id: props.selectedDragon.id,
      idToken: freshToken,
      itemId: selectedItemId.value // [NEW] 선택된 아이템 ID 전달
    })
    
    // [NEW] 상태에 따른 분기 처리
    if (response.data.status === 'retry') {
      // 실패(재시도) 케이스: 피드백 모달 표시
      feedbackData.value = {
        score: response.data.score,
        msg: response.data.feedback,
        suggestion: response.data.suggestion
      }
      showFeedbackModal.value = true
    } else {
      // 성공 케이스: 에너지 차감 및 결과 표시
      emit('use-energy')
      evaluationResult.value = response.data
    }
    
  } catch (error) {
    console.error('평가 실패:', error)
    alert('이야기 분석 중에 오류가 발생했습니다.')
  } finally {
    // [NEW] AI 리터러시 평가 및 저장 (freshToken 사용)
    const user = auth.currentUser
    const token = user ? await user.getIdToken() : props.idToken
    axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
      prompt: userPrompt.value,
      dragon_id: props.selectedDragon.id,
      idToken: token
    }).then(r => console.log('평가 저장 완료:', r.data))
      .catch(err => console.error('평가 저장 실패:', err))

    isLoading.value = false
  }
}

const closeFeedbackModal = () => {
  showFeedbackModal.value = false
  // 알림창만 닫고, 입력했던 내용은 유지 (사용자가 수정할 수 있도록)
}

const handleRetry = () => {
  evaluationResult.value = null
  // userPrompt.value = '' // [변경] 입력 초기화 제거 (수정해서 다시 제출 가능하도록)
}

const handleKeyDown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submitPrompt()
  }
}

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
  recognition.interimResults = false // 중간 결과 사용 안 함 (완료 시 입력)
  recognition.maxAlternatives = 1

  recognition.onstart = () => {
    isListening.value = true
  }

  recognition.onend = () => {
    isListening.value = false
  }

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript
    // 기존 입력값 뒤에 이어붙이기 (공백 추가)
    if (userPrompt.value) {
      userPrompt.value += ' ' + transcript
    } else {
      userPrompt.value = transcript
    }
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
  <div class="main-viewport" :class="{ 'focused': isFocused }">
    <div class="background-container">
      <img src="../assets/s08.png" class="background-img" alt="Background" />
    </div>

    <div class="content-wrapper">
      <!-- 상단: 에너지 바 + 도감 버튼 -->
      <div class="top-bar">
        <button class="home-btn" @click="emit('go-encyclopedia')" v-show="!isFocused && !isLoading">
          ← 도감
        </button>
        <div class="energy-bar">
          <span class="energy-icon">⚡</span>
          <div class="energy-dots">
            <span
              v-for="i in 5" :key="i"
              class="energy-dot"
              :class="{ filled: i <= props.energy }"
            />
          </div>
          <span class="energy-text">{{ props.energy }}/5</span>
        </div>
      </div>

      <!-- 드래곤 + 카드 통합 영역 -->
      <main class="card-area">
        <!-- 드래곤 원형 버블 -->
        <div class="dragon-bubble-area" v-if="selectedDragon">
          <div class="dragon-circle">
            <img
              :src="selectedDragon.image_url || '/src/assets/s07_icon1.png'"
              class="floating-dragon"
              alt="Dragon"
              @error="(e) => e.target.src = '/src/assets/s07_icon1.png'"
            />
          </div>
        </div>
        <div class="white-card">
          <h2 class="question-text">
            {{ selectedDragon?.name }}에게 어떤 모험을 들려줄래?
          </h2>
        </div>
      </main>

      <footer class="input-area" :class="{ 'lifted': isFocused }">
        <div class="coach-msg" :class="promptStatus.type" v-if="userPrompt.length > 0">
          {{ promptStatus.msg }}
        </div>

        <div class="input-group square-box" :class="{ 'valid-border': promptStatus.type === 'good', 'focus-border': isFocused }">
          <!-- [NEW] 마이크 버튼 -->
          <button 
            class="mic-btn" 
            :class="{ listening: isListening }"
            @click="startListening"
            title="말로 입력하기"
          >
            🎙️
          </button>
          <textarea 
            v-model="userPrompt" 
            :placeholder="currentPlaceholder" 
            class="chat-input-area"
            @focus="isFocused = true"
            @blur="isFocused = false"
            @keydown="handleKeyDown"
          ></textarea>
          
          <button class="submit-btn" :disabled="promptStatus.type !== 'good' || isLoading" @click="submitPrompt">
            {{ isLoading ? '생성 중...' : '이야기 만들기 ✨' }}
          </button>
        </div>

        <div class="footer-btns">
          <button class="item-select-btn" @click="showItemModal = true" v-show="!isFocused && !isLoading">
            <span v-if="selectedItemId" class="selected-badge">
              {{ selectedItem?.image }} 장착 중
            </span>
            <span v-else>🎒 아이템 가방</span>
          </button>
          
          <button class="library-toggle-btn" @click="showLibrary = true" v-show="!isFocused && !isLoading">
            📂 {{ selectedDragon.name }}의 동화 모음집
          </button>
        </div>
      </footer>
    </div>

    <!-- [NEW] 아이템 선택 모달 (MainLobby 스타일) -->
    <div v-if="showItemModal" class="modal-overlay" @click.self="showItemModal = false">
      <div class="modal-content">
        <div class="modal-header-cloud">
          <button class="close-x-btn" @click="showItemModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="input-intro">
            <p class="intro-text">✨ 어떤 도우미를 사용할까요?</p>
          </div>
          
          <div class="item-selection-area">
            <div class="item-list-horizontal">
              <div 
                v-for="item in userHelpers" 
                :key="item.id"
                class="item-chip"
                :class="{ 
                  active: selectedItemId === item.id,
                  disabled: item.quantity <= 0 
                }"
                @click="item.quantity > 0 ? (selectedItemId = (selectedItemId === item.id ? null : item.id)) : null"
              >
                <span class="chip-icon">{{ item.image }}</span>
                <div class="chip-info">
                  <span class="chip-label">{{ item.name }}</span>
                  <span class="chip-qty">x{{ item.quantity }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer" style="margin-top: 20px;">
            <button class="finish-btn" @click="showItemModal = false">장착 완료</button>
          </div>
        </div>
      </div>
    </div>


    <!-- 평가 결과 모달 -->
      <StoryEvaluation 
        v-if="evaluationResult"
        :evaluation="evaluationResult"
        :dragon="selectedDragon"
        :id-token="props.idToken"
        @close="evaluationResult = null"
        @saved="onStorySaved"
    />

    <!-- [NEW] 피드백 모달 (퀘스트 실패 시) -->
    <StoryFeedback
      v-if="showFeedbackModal"
      :score="feedbackData?.score"
      :feedback="feedbackData?.msg"
      :suggestion="feedbackData?.suggestion"
      @retry="closeFeedbackModal"
    />

    <!-- [NEW] 동화 도서관 (모음집) 모달 -->
    <StoryLibrary
      v-if="showLibrary"
      :key="libraryKey"
      :dragon="selectedDragon"
      :idToken="idToken"
      :energy="props.energy"
      @close="showLibrary = false"
    />
  </div>
</template>

<style scoped>
.main-viewport { 
  position: relative; 
  width: 100vw; 
  height: 100dvh; 
  overflow: hidden; 
  transition: all 0.3s ease;
}

.footer-btns {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.background-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
.background-img { width: 100%; height: 100%; object-fit: cover; }

.content-wrapper { 
  position: relative; 
  z-index: 1; 
  width: 100%; 
  height: 100%; 
  display: flex; 
  flex-direction: column; 
  justify-content: center;
  align-items: center;
  box-sizing: border-box; 
  padding: 60px 0 20px;
  gap: 16px;
  overflow: hidden;
}

/* 상단 바 */
.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(6px);
}

.home-btn {
  background: rgba(255, 255, 255, 0.85);
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  color: #7DA0FF;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(125, 160, 255, 0.25);
  transition: all 0.2s;
}
.home-btn:active { transform: scale(0.95); }

/* 에너지 바 */
.energy-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.85);
  padding: 6px 12px;
  border-radius: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.energy-icon { font-size: 1rem; }
.energy-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}
.energy-dot {
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #ddd;
  transition: background 0.3s;
}
.energy-dot.filled { background: #FFD700; box-shadow: 0 0 4px rgba(255,215,0,0.6); }
.energy-text { font-size: 0.8rem; font-weight: 700; color: #555; }

.header-area { 
  margin-top: 10px; 
  display: flex; 
  justify-content: center; 
  flex-shrink: 0; 
}
.app-logo { width: 80%; max-width: 350px; height: auto; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2)); }

.card-area { 
  width: 90%;
  display: flex; 
  flex-direction: column; 
  align-items: center;
  margin-top: 0;
  flex-shrink: 0;
}

.dragon-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
    margin-bottom: -80px !important; /* 흰 카드와 살짝만 겹치도록 */
    transform: translateY(0) !important; /* 자연스러운 위치 */
}

.floating-dragon { 
  width: 140px; 
  height: 140px; 
  object-fit: contain;
  filter: drop-shadow(0 5px 15px rgba(0,0,0,0.2)); 
  animation: float 3s ease-in-out infinite; 
}

.dragon-name-tag {
    background: #7DA0FF;
    color: white;
    padding: 4px 12px;
    border-radius: 10px;
    font-size: 0.8rem;
    font-weight: bold;
    margin-top: -10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

@keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-15px); } 100% { transform: translateY(0px); } }

.white-card { 
  background: rgba(255, 255, 255, 0.88); 
  backdrop-filter: blur(10px);
  width: 100%; 
  max-width: 320px; 
  border-radius: 30px;
  padding: 32px 20px; /* 상하 패딩 균형 조정 */
  text-align: center; 
  box-shadow: 0 10px 30px rgba(125, 160, 255, 0.3); 
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-sizing: border-box;
  overflow: hidden;
  margin-top: 15px; /* 원이랑 살짝 떨어지도록 간격 추가 */
}
.question-text { color: #444; font-size: 1.1rem; line-height: 1.5; margin: 0; font-weight: 700; word-break: keep-all; }

/* 드래곤 원형 버블 영역 */
.dragon-bubble-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
}

.dragon-circle {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e8f4ff, #f0e8ff);
  border: 4px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 24px rgba(125, 160, 255, 0.35),
              inset 0 2px 6px rgba(255,255,255,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  animation: float 3s ease-in-out infinite;
  /* 아래쪽 모서리를 살짝 눌러서 카드와 자연스럽게 연결 */
  border-bottom-left-radius: 40%;
  border-bottom-right-radius: 40%;
  border-bottom: 4px solid rgba(255, 255, 255, 0.95);
}

.input-area { 
  width: 100%;
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  gap: 15px; 
  padding-bottom: 20px;
  transition: all 0.3s ease;
}

.input-area.lifted {
    transform: translateY(0);
}

.coach-msg { font-size: 0.95rem; font-weight: bold; animation: popIn 0.3s ease; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.coach-msg.bad { color: #FF6B6B; background: white; padding: 6px 15px; border-radius: 15px; box-shadow: 0 4px 10px rgba(255,107,107,0.2); }
.coach-msg.warning { color: #FF9F43; background: white; padding: 6px 15px; border-radius: 15px; box-shadow: 0 4px 10px rgba(255,159,67,0.2); }
.coach-msg.good { color: #1DD1A1; background: white; padding: 6px 15px; border-radius: 15px; box-shadow: 0 4px 10px rgba(29,209,161,0.2); }

@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }

.input-group.square-box { 
  display: flex; 
  width: 80%; 
  max-width: 340px; 
  height: 160px; 
  background: rgba(255, 255, 255, 0.95); 
  border-radius: 25px; 
  padding: 20px; 
  box-shadow: 0 10px 30px rgba(125, 160, 255, 0.2); 
  border: 3px solid transparent; 
  transition: all 0.3s; 
  position: relative; 
  flex-direction: column; 
}
.input-group.focus-border { border-color: #7DA0FF; box-shadow: 0 0 25px rgba(125, 160, 255, 0.4); }
.input-group.valid-border { border-color: #1DD1A1; }

.chat-input-area { 
  border: none; 
  background: transparent; 
  width: 100%; 
  height: 100%; 
  font-size: 1.15rem; 
  outline: none; 
  color: #333; 
  line-height: 1.6; 
  resize: none; 
  font-family: inherit; 
  padding-right: 40px; /* 마이크 버튼 공간 확보 */
}
.chat-input-area::placeholder { color: #ccc; font-size: 1rem; line-height: 1.4; white-space: pre-wrap; }

.submit-btn {
  position: absolute; 
  bottom: 15px; 
  right: 15px; 
  background: linear-gradient(135deg, #7DA0FF, #5C85FF); 
  color: white; 
  border: none; 
  padding: 12px 20px; 
  border-radius: 15px; 
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s; 
  box-shadow: 0 4px 15px rgba(92,133,255,0.4);
}
.submit-btn:active { transform: scale(0.9); }
.submit-btn:disabled { background: #eee; color: #ccc; cursor: not-allowed; box-shadow: none; }

.library-toggle-btn {
  margin-top: 15px;
  background: white;
  color: #5c89ff;
  border: 2px solid #5c89ff;
  padding: 12px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.library-toggle-btn:hover { background: #f0f4ff; }

/* [NEW] 마이크 버튼 스타일 */
.mic-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  background: white;
  border: 2px solid #eee;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.mic-btn:hover {
  background: #f9f9f9;
  transform: scale(1.1);
}

.mic-btn.listening {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(255, 107, 107, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
}

.loader {
    width: 24px;
    height: 24px;
    border: 3px solid #FFF;
    border-bottom-color: transparent;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 1s linear infinite;
}

@keyframes rotation { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.footer-btns {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.item-select-btn {
  background: white;
  border: 2px solid #7DA0FF;
  color: #7DA0FF;
  padding: 10px 24px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(125,160,255,0.15);
  transition: all 0.2s;
  min-width: 160px;
}

.selected-badge {
  color: #FF9F43;
}

/* [NEW] MainLobby 스타일 가져오기 */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 100;
  backdrop-filter: blur(5px);
}

.modal-content {
  position: relative;
  width: 90vw; max-width: 380px;
  background-color: white;
  border-radius: 35px;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  transform: translateY(-30px);
}

.modal-header-cloud {
  height: 45px;
  background: #f9fbfd;
  display: flex; align-items: center; justify-content: flex-end;
  padding: 0 15px;
}

.close-x-btn {
  background: none; border: none; color: #ccc;
  font-size: 32px; font-weight: 200; cursor: pointer;
  transition: color 0.2s, transform 0.2s;
}

.modal-body {
  padding: 25px;
  display: flex; flex-direction: column; align-items: center;
  background-color: #f9fbfd;
}

.input-intro { margin-bottom: 20px; }
.intro-text { font-weight: bold; color: #555; font-size: 1.1rem; }

.item-selection-area {
  width: 100%;
  background: rgba(255, 255, 255, 0.5);
  padding: 15px;
  border-radius: 20px;
  border: 2px dashed #7DA0FF;
  box-sizing: border-box;
}

.item-list-horizontal {
  display: flex; gap: 10px; overflow-x: auto; padding: 5px 0;
  -webkit-overflow-scrolling: touch;
}

.item-list-horizontal::-webkit-scrollbar { display: none; }

.item-chip {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 14px; background: white;
  border: 2px solid #eee; border-radius: 15px;
  cursor: pointer; white-space: nowrap; transition: all 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.03);
}

.item-chip.active {
  background: #f0f4ff; border-color: #7DA0FF;
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(125,160,255,0.2);
}

.item-chip.disabled {
  opacity: 0.7;
  background: #f5f5f5;
  cursor: not-allowed;
}

.chip-icon { font-size: 1.5rem; }
.chip-info { display: flex; flex-direction: column; align-items: flex-start; }
.chip-label { font-size: 0.8rem; font-weight: 700; color: #555; }
.chip-qty { font-size: 0.7rem; color: #7DA0FF; font-weight: 800; }

.modal-footer { width: 100%; }
.finish-btn {
  width: 100%; padding: 16px 0; border-radius: 30px;
  border: none; font-size: 1.1rem; font-weight: bold;
  cursor: pointer; background-color: #81d4fa; color: white;
  transition: transform 0.2s;
}
.finish-btn:active { transform: scale(0.96); }
</style>