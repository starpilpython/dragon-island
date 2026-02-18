<script setup>
import { ref, onMounted, watch } from 'vue'
import { auth } from './firebase'
import { onAuthStateChanged, onIdTokenChanged } from 'firebase/auth'
import axios from 'axios'

// [NEW] Axios Interceptor: 모든 요청 전에 최신 토큰을 확인하고 주입합니다.
axios.interceptors.request.use(async (config) => {
  // 백엔드 API 주소로 가는 요청인 경우에만 토큰 주입
  const apiUrl = import.meta.env.VITE_API_URL
  if (config.url && config.url.includes(apiUrl)) {
    const user = auth.currentUser
    if (user) {
      try {
        // Firebase가 토큰 만료 여부를 체크하고 필요시 자동으로 갱신해줍니다.
        const token = await user.getIdToken()
        config.headers.Authorization = `Bearer ${token}`
      } catch (error) {
        console.error('Interceptor: 토큰 갱신 실패', error)
      }
    }
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

import LoginView from './components/LoginView.vue'
import MainLobby from './components/MainLobby.vue'
import LoadingDragon from './components/LoadingDragon.vue'
import ResultSuccess from './components/ResultSuccess.vue'

// 유저 로그상태 관리
const isLoggedIn = ref(false)
const idToken = ref('')

// [NEW] 드래곤 생성 관련 상태 관리
const isGenerating = ref(false)
const isSuccess = ref(false)
const feedbackMessage = ref('')
const currentScore = ref(0)
const currentDragon = ref(null)
const shouldOpenModalOnReturn = ref(false)

// ---// 에너지 & 재화 시스템
const energy = ref(5)
const money = ref(0)
const userItems = ref({}) // [NEW] 보유 아이템 (item_id: quantity)
const maxEnergy = 5
const lastRechargeTime = ref(Date.now()) // 마지막으로 에너지가 충전된 시간 (밀리초)
const rechargeInterval = 10 * 60 * 1000 // 10분 (밀리초)

// [NEW] 서버에서 유저 프로필(에너지 등) 가져오기
const fetchUserProfile = async () => {
  if (!idToken.value) return
  
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${idToken.value}` }
    })
    const profile = response.data
    console.log('유저 프로필 로드:', profile)
    
    if (profile.energy !== undefined) {
      energy.value = profile.energy
    }
    if (profile.money !== undefined) {
      money.value = profile.money
    }
    if (profile.items !== undefined) { // [NEW] 아이템 로드
      userItems.value = profile.items
    }
    if (profile.last_recharge_time) {
      lastRechargeTime.value = new Date(profile.last_recharge_time).getTime()
    }
  } catch (error) {
    console.error('프로필 로드 실패:', error)
  }
}

// [NEW] 서버로 에너지 상태 동기화
const syncEnergyWithServer = async () => {
  if (!idToken.value) return
  
  try {
    await axios.post(`${import.meta.env.VITE_API_URL}/api/user/energy`, {
      energy: energy.value,
      last_recharge_time: new Date(lastRechargeTime.value).toISOString()
    }, {
      headers: { 'Authorization': `Bearer ${idToken.value}` }
    })
    console.log('에너지 서버 동기화 완료')
  } catch (error) {
    console.error('에너지 동기화 실패:', error)
  }
}

const timerText = ref("00:00")
let timerInterval = null

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const startRechargeTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (energy.value < maxEnergy) {
      const now = Date.now()
      const timeSinceLastRecharge = now - lastRechargeTime.value
      
      // 충전 간격이 지났는지 확인
      if (timeSinceLastRecharge >= rechargeInterval) {
        energy.value++
        lastRechargeTime.value = now // 마지막 충전 시간 업데이트
        syncEnergyWithServer() // [NEW] 에너지 충전 시 서버와 동기화
      }
      
      // 다음 충전까지 남은 시간 계산
      const timeToNextRecharge = rechargeInterval - (now - lastRechargeTime.value)
      timerText.value = formatTime(Math.max(0, Math.ceil(timeToNextRecharge / 1000)))
    } else {
      timerText.value = "MAX"
    }
  }, 1000)
}


// StoryTeller에서 에너지 차감 이벤트 처리
const handleUseEnergy = async () => {
  if (energy.value > 0) {
    energy.value--
    await syncEnergyWithServer()
    await fetchUserProfile() // [NEW] 아이템 수량 등 프로필 최신화
  }
}

// [NEW] 에너지 충전 이벤트 처리 (광고 시청 후)
const handleRechargeEnergy = async () => {
  await fetchUserProfile() // 서버에서 최신 에너지 상태 가져오기
}

// [핵심] 드래곤 생성 시작 및 백엔드 연동 함수
const handleStartGeneration = async (userPrompt, isRetry = false, itemId = null) => {
  if (isRetry || energy.value > 0) {
    if (!isRetry) {
      if (energy.value === maxEnergy) {
        lastRechargeTime.value = Date.now()
      }
      energy.value--
      await syncEnergyWithServer() // [FIX] 서버 동기화 완료 후 진행
    }

    isGenerating.value = true
    isSuccess.value = false
    feedbackMessage.value = ''
    currentScore.value = 0
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/create-dragon`, {
        prompt: userPrompt,
        idToken: idToken.value,
        itemId: itemId // [NEW] 아이템 ID 전달
      })

      const result = response.data
      console.log('생성 결과:', result)
      currentScore.value = result.score || 0

      if (result.score >= 80) {
        currentDragon.value = result
        isGenerating.value = false
        isSuccess.value = true
        await fetchUserProfile() // [NEW] 생성 성공 시 아이템 차감 반영을 위해 프로필 갱신
      } else {
        feedbackMessage.value = result.feedback || result.explanation || "드래곤이 조금 더 구체적인 설명을 원합니다!"
      }
    } catch (error) {
      console.error('드래곤 생성 실패:', error)
      const serverErrorMsg = error.response?.data?.detail || '생성 중 오류가 발생했습니다. 다시 시도해 주세요.'
      feedbackMessage.value = serverErrorMsg
      currentScore.value = 0
    } finally {
      // [NEW] AI 리터러시 평가 및 저장 (비동기로 실행, 드래곤 생성 성공 여부와 무관하게 기록)
      const targetId = currentDragon.value?.id || 'creation_attempt'
      axios.post(`${import.meta.env.VITE_API_URL}/api/evaluate`, {
        prompt: userPrompt,
        dragon_id: targetId,
        idToken: idToken.value
      }).then(r => console.log('평가 저장 완료:', r.data))
        .catch(err => console.error('평가 저장 실패:', err))
    }
  } else {
    alert('에너지가 부족합니다! 충전될 때까지 잠시만 기다려 주세요.')
  }
}

const initialTab = ref('만들기')
const initialDragon = ref(null)

const handleRetry = () => {
  isGenerating.value = false
  feedbackMessage.value = ''
  shouldOpenModalOnReturn.value = true
}

const handleGoHome = () => {
  isSuccess.value = false
  isGenerating.value = false
  initialTab.value = '만들기'
  initialDragon.value = null
}

const handleReadStoryFromSuccess = () => {
  isSuccess.value = false
  isGenerating.value = false
  initialTab.value = '동화'
  initialDragon.value = currentDragon.value
}

// [NEW] 토큰이 생기면 유저 프로필(에너지 등) 불러오기
watch(idToken, (newToken) => {
  if (newToken) {
    fetchUserProfile()
  }
})

// [NEW] 토큰 강제 갱신 함수
const refreshToken = async () => {
  const user = auth.currentUser
  if (user) {
    try {
      idToken.value = await user.getIdToken(true) // force refresh
      console.log('토큰이 강제로 갱신되었습니다.')
      return idToken.value
    } catch (error) {
      console.error('토큰 갱신 실패:', error)
    }
  }
  return null
}

onMounted(() => {
  startRechargeTimer()
  
  // URL 파라미터 체크 (결제 후 복귀 등)
  const urlParams = new URLSearchParams(window.location.search)
  const targetTab = urlParams.get('tab')
  if (targetTab) {
    initialTab.value = targetTab
  }
  
  // onAuthStateChanged 대신 onIdTokenChanged 사용 (토큰 만료/갱신 대응)
  onIdTokenChanged(auth, async (user) => {
    isLoggedIn.value = !!user
    if (user) {
      const token = await user.getIdToken()
      idToken.value = token
      localStorage.setItem('idToken', token) // [FIX] 새로고침 시에도 토큰 저장
      console.log('Auth State Changed: Token updated')
    } else {
      idToken.value = ''
      localStorage.removeItem('idToken') // 로그아웃 시 토큰 삭제
    }
  })

  // 1시간(60분) 만료를 대비해 50분마다 자동 갱신 타이머 동작
  setInterval(async () => {
    if (isLoggedIn.value) {
      await refreshToken()
    }
  }, 50 * 60 * 1000)
})
</script>

<template>
  <div class="main-container">
    <ResultSuccess 
      v-if="isSuccess" 
      :energy="energy" 
      :timerText="timerText"
      :dragonName="currentDragon?.name"
      :dragonImage="currentDragon?.image_url"
      :dragonDescription="currentDragon?.description"
      @go-home="handleGoHome" 
      @read-story="handleReadStoryFromSuccess"
    />

    <LoadingDragon 
      v-else-if="isGenerating" 
      :feedback="feedbackMessage" 
      :score="currentScore"
      @retry="handleRetry" 
    />
    
    <template v-else>
      <LoginView v-if="!isLoggedIn" />
      <MainLobby 
        v-else 
        :energy="energy" 
        :money="money"
        :timerText="timerText"
        :idToken="idToken"
        :forceOpenModal="shouldOpenModalOnReturn"
        :initialTab="initialTab"
        :initialDragon="initialDragon"
        :userItems="userItems"
        @start-generation="handleStartGeneration" 
        @update:money="money = $event"
        @refresh-profile="fetchUserProfile"
        @modal-opened="shouldOpenModalOnReturn = false"
        @use-energy="handleUseEnergy"
        @recharge-energy="handleRechargeEnergy"
      />
    </template>
  </div>
</template>

<style>
body {
  margin: 0;
  padding: 0;
}

.main-container {
  width: 100vw;
  height: 100vh;
}
</style>