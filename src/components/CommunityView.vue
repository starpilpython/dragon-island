<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import CommunityDetailModal from './CommunityDetailModal.vue'
import StoryLibrary from './StoryLibrary.vue'
import s13Logo from '../assets/s13_logo.png'

const props = defineProps({
  idToken: String
})

const emit = defineEmits(['modal-state-change'])

const activeTab = ref('all') // 'all' (모두의 드래곤) | 'mine' (내 드래곤 관리)
const communityDragons = ref([])
const myDragons = ref([])
const isLoading = ref(false)

// [NEW] 모달 관련 상태
const isResultModalOpen = ref(false)
const resultModalMessage = ref('')
const resultModalType = ref('info') // 'info', 'success', 'error'

const isConfirmModalOpen = ref(false)
const confirmModalMessage = ref('')
const onConfirmAction = ref(null)

const openResultModal = (message, type = 'info') => {
  resultModalMessage.value = message
  resultModalType.value = type
  isResultModalOpen.value = true
}

const closeResultModal = () => {
  isResultModalOpen.value = false
}

const openConfirmModal = (message, action) => {
  confirmModalMessage.value = message
  onConfirmAction.value = action
  isConfirmModalOpen.value = true
}

const closeConfirmModal = () => {
  isConfirmModalOpen.value = false
}

const handleConfirm = () => {
  if (onConfirmAction.value) onConfirmAction.value()
  closeConfirmModal()
}

const isDetailOpen = ref(false)
const selectedDragon = ref(null)

// [NEW] 커뮤니티 동화 목록 모달 관련 상태
const isCommunityStoryOpen = ref(false)
const selectedDragonForStories = ref(null)

// [NEW] 정렬 옵션 State
const sortOption = ref('latest') // 'latest' | 'popular'

// [NEW] 정렬된 드래곤 목록 Computed
const sortedCommunityDragons = computed(() => {
  // 원본 보호를 위해 복사
  const list = [...communityDragons.value]
  
  if (sortOption.value === 'popular') {
    // 조회수 내림차순 (같으면 최신순)
    return list.sort((a, b) => {
      const viewA = a.views || 0
      const viewB = b.views || 0
      if (viewB !== viewA) return viewB - viewA
      
      // 조회수 같으면 최신순
      const dateA = new Date(a.shared_at || 0)
      const dateB = new Date(b.shared_at || 0)
      return dateB - dateA
    })
  } else {
    // 최신순 (shared_at 기준 내림차순)
    return list.sort((a, b) => {
      const dateA = new Date(a.shared_at || 0)
      const dateB = new Date(b.shared_at || 0)
      return dateB - dateA
    })
  }
})

// API URL (환경변수 또는 하드코딩)
const API_URL = import.meta.env.VITE_API_URL

const incrementView = async (dragon) => {
  try {
    dragon.views = (dragon.views || 0) + 1
    await axios.post(`${import.meta.env.VITE_API_URL}/api/community/${dragon.id}/view`)
  } catch (error) {
    console.error('조회수 증가 실패:', error)
  }
}

// 1. 커뮤니티 목록 가져오기
const fetchCommunityDragons = async () => {
  if (sortOption.value === 'popular') return // 인기순은 클라이언트 정렬이므로 API 호출 불필요 (필요 시 API 수정)
  
  isLoading.value = true
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/community`)
    
    // 데이터 가공 (뷰 카운트 등)
    communityDragons.value = response.data.map(d => ({
      ...d,
      views: d.views || 0 // Ensure views property exists
    }))
  } catch (error) {
    console.error('커뮤니티 목록 로드 실패:', error)
  } finally {
    isLoading.value = false
  }
}

// 2. 내 드래곤 목록 가져오기 (공유 관리를 위해)
const fetchMyDragons = async () => {
  if (!props.idToken) return
  isLoading.value = true
  try {
    const response = await axios.get(`${API_URL}/api/dragons`, {
      headers: { 'Authorization': `Bearer ${props.idToken}` }
    })
    myDragons.value = response.data
  } catch (error) {
    console.error('내 드래곤 로드 실패:', error)
  } finally {
    isLoading.value = false
  }
}

// 3. 드래곤 공유하기
const shareDragon = async (dragon) => {
  openConfirmModal(`'${dragon.name}'을(를) 커뮤니티에 공유하시겠습니까?`, async () => {
    try {
      isLoading.value = true
      await axios.post(`${API_URL}/api/community`, {
        idToken: props.idToken,
        dragon_id: dragon.id
      })
      openResultModal('성공적으로 공유되었습니다!', 'success')
      fetchCommunityDragons() // 목록 갱신
      activeTab.value = 'all' // 목록 탭으로 이동
    } catch (error) {
      console.error('공유 실패:', error)
      openResultModal('공유 중 오류가 발생했습니다.', 'error')
    } finally {
      isLoading.value = false
    }
  })
}

// 4. 공유 취소하기
// 내 드래곤 목록에서 이미 공유된 상태를 알 수 있으면 좋겠지만,
// 현재는 커뮤니티 목록에서 "내 드래곤"인지 식별해서 삭제 버튼을 보여주는 방식이 간단함.
// 하지만 요구사항은 "관리" 탭이므로, 커뮤니티 목록을 순회하며 내 드래곤인지 확인하는 로직 필요.

// 내 드래곤인지 확인하는 헬퍼 (간단히 로컬 스토리지 UID 활용하거나 토큰 디코딩 필요하지만, 
// 여기서는 커뮤니티 데이터에 포함된 `uid`와 내 `uid`를 비교해야 함.
// 하지만 클라이언트 단에서 내 uid를 정확히 알기 위해선 백엔드 도움이 필요.
// 일단은 '삭제' 요청을 보내보고 성공하면 내 것, 실패하면 남의 것으로 처리하거나
// 별도 tab에서 관리.

const unshareDragon = async (dragonId) => {
  openConfirmModal('정말 공유를 취소하시겠습니까?', async () => {
    try {
      isLoading.value = true
      // [FIX] DELETE 요청으로 복원
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/community/${dragonId}`, {
        data: { 
          idToken: props.idToken,
          dragon_id: dragonId 
        }
      })
    
    openResultModal('공유가 취소되었습니다.', 'success')
    
    // 목록 갱신
    fetchCommunityDragons()
    fetchMyDragons()
    } catch (error) {
      console.error('공유 취소 실패:', error)
      openResultModal('공유 취소에 실패했습니다. (본인의 드래곤만 취소할 수 있습니다)', 'error')
    } finally {
      isLoading.value = false
    }
  })
}

// 5. 상세 정보 보기
const openDetail = async (dragon) => {
  // 커뮤니티 탭일 경우 조회수 증가 API 호출
  if (activeTab.value === 'all') { // Changed from 'community' to 'all' to match activeTab ref
    try {
      await axios.post(`${API_URL}/api/community/${dragon.id}/view`)
      // 로컬 상태 업데이트 (선택적: 즉시 반영)
      dragon.views = (dragon.views || 0) + 1
    } catch (e) {
      console.error("Failed to increment view count", e)
    }
    
    selectedDragon.value = dragon
    isDetailOpen.value = true
    emit('modal-state-change', true) // 모달 열림 알림
  } else {
    // 관리 탭일 경우 기존 로직
    selectedDragon.value = dragon
    isDetailOpen.value = true
    // 관리 탭 상세는 Bottom Nav 숨김 여부를 MainLobby에서 처리하지 않으므로 emit 불필요할 수 있으나 통일성을 위해 유지
  }
}

const handleDeleteFromModal = (dragon) => {
  unshareDragon(dragon.id)
  isDetailOpen.value = false
}

const handleReadStory = (dragon) => {
  selectedDragonForStories.value = dragon
  isCommunityStoryOpen.value = true
  // 상세 모달은 닫을지 열어둘지 선택 가능한데, 보통 닫는 게 깔끔함
  isDetailOpen.value = false 
}

// [NEW] 모달 상태 변경 시 부모(MainLobby)에게 알림 (하단 탭바 숨기기용)
watch([isDetailOpen, isCommunityStoryOpen], ([detailVal, storyVal]) => {
  emit('modal-state-change', detailVal || storyVal)
})

// 탭 변경 시 데이터 로드
watch(activeTab, (newTab) => {
  if (newTab === 'all') fetchCommunityDragons()
  else fetchMyDragons()
})

onMounted(() => {
  fetchCommunityDragons()
})

// [NEW] 토큰이 뒤늦게 로드되거나 변경될 때 대응
watch(() => props.idToken, (newToken) => {
  if (newToken) {
    if (activeTab.value === 'all') fetchCommunityDragons()
    else fetchMyDragons()
  }
})

// 내 드래곤이 이미 공유되었는지 확인 (UI 표시용)
const isShared = (dragonId) => {
  return communityDragons.value.some(d => d.id === dragonId)
}

// [NEW] 토큰에서 UID 추출 함수 (Base64Url 디코딩)
const getUidFromToken = (token) => {
  try {
    if (!token) return null
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
    return JSON.parse(jsonPayload).user_id
  } catch (e) {
    console.error('UID 추출 실패:', e)
    return null
  }
}

const currentUid = computed(() => getUidFromToken(props.idToken))

// 내 드래곤인지 확인하는 헬퍼
const isMyDragon = (dragon) => {
  if (!dragon || !currentUid.value) return false
  return dragon.owner_uid === currentUid.value
}

// [NEW] 내 UID 식별 (이제 토큰 기반으로 정확히 동작)
const myUid = currentUid
</script>

<template>
  <div class="community-view">
    <div class="header-logo-container">
      <img :src="s13Logo" class="header-logo" alt="Community Logo" />
      
      <!-- [NEW] 정렬 필터 (타이틀 옆에 배치) -->
      <div v-if="activeTab === 'all'" class="header-sort-buttons">
        <button 
          class="header-filter-btn" 
          :class="{ active: sortOption === 'latest' }"
          @click="sortOption = 'latest'"
          title="최신순"
        >
          🕒
        </button>
        <button 
          class="header-filter-btn" 
          :class="{ active: sortOption === 'popular' }"
          @click="sortOption = 'popular'"
          title="인기순"
        >
          🔥
        </button>
      </div>
    </div>

    <div class="tabs">
      <button 
        class="tab-btn" 
        :class="{ 'active-all': activeTab === 'all' }"
        @click="activeTab = 'all'"
      >
        🌏 모두의 드래곤
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'mine' }"
        @click="activeTab = 'mine'"
      >
        📤 공유 관리
      </button>
    </div>

    <!-- 1. 모두의 드래곤 리스트 -->
    <div v-if="activeTab === 'all'" class="dragon-grid">
      <div v-if="isLoading" class="loading">로딩 중...</div>
      <div v-else-if="communityDragons.length === 0" class="empty-state">
        아직 공유된 드래곤이 없습니다.<br>첫 번째 주인공이 되어보세요!
      </div>

      <div 
        v-for="dragon in sortedCommunityDragons" 
        :key="dragon.id" 
        class="dragon-card"
        @click="openDetail(dragon)"
      >
        <div class="dragon-image">
          <img :src="dragon.image_url" alt="Dragon" />
        </div>
        <div class="dragon-info">
          <span class="exp-badge">EXP {{ dragon.exp || 0 }}</span>
          <h3>{{ dragon.name }}</h3>
          <p class="desc">{{ dragon.personality || '신비로운 드래곤' }}</p>
          
          <!-- [NEW] 조회수 표시 (인기순일 때 강조) -->
          <div class="view-count">
            👁️ {{ dragon.views || 0 }}
          </div>

          <!-- [NEW] 내 드래곤인 경우 배지 표시 -->
          <div v-if="dragon.owner_uid === myUid" class="my-badge">내 드래곤</div>
        </div>
      </div>
    </div>

    <!-- 2. 공유 관리 리스트 -->
    <div v-else class="dragon-list">
      <div v-if="isLoading" class="loading">로딩 중...</div>
      <div 
        v-for="dragon in myDragons" 
        :key="dragon.id" 
        class="manage-row"
        @click="openDetail(dragon)"
      >
        <img :src="dragon.image_url" class="thumb" />
        <div class="row-info">
          <span class="name">{{ dragon.name }}</span>
          <span class="sub">EXP: {{ dragon.exp }}</span>
        </div>
        
        <button 
          v-if="isShared(dragon.id)" 
          class="action-btn cancel"
          @click.stop="unshareDragon(dragon.id)"
        >
          공유 취소
        </button>
        <button 
          v-else 
          class="action-btn share"
          @click.stop="shareDragon(dragon)"
        >
          공유하기
        </button>
      </div>
    </div>

    <!-- 3. 상세 정보 모달 (커뮤니티 전용) -->
    <CommunityDetailModal
      v-if="isDetailOpen"
      :dragon="selectedDragon"
      :isOwner="isMyDragon(selectedDragon)"
      @close="isDetailOpen = false"
      @read-story="handleReadStory"
      @unshare="handleDeleteFromModal"
    />

    <!-- [NEW] 커뮤니티 동화 목록 모달 -->
    <StoryLibrary
      v-if="isCommunityStoryOpen"
      :dragon="selectedDragonForStories"
      :idToken="idToken"
      :isCommunity="true"
      @close="isCommunityStoryOpen = false"
    />

    <!-- [NEW] 알림 모달 (Success/Error) -->
    <div v-if="isResultModalOpen" class="modal-overlay" @click.self="closeResultModal">
      <div class="modal-content">
        <h3 class="modal-title">
          {{ resultModalType === 'error' ? '오류' : (resultModalType === 'success' ? '성공' : '알림') }}
        </h3>
        <p class="modal-message" :class="resultModalType">{{ resultModalMessage }}</p>
        <button class="modal-close-btn" @click="closeResultModal">확인</button>
      </div>
    </div>

    <!-- [NEW] 확인 모달 (Share/Unshare) -->
    <div v-if="isConfirmModalOpen" class="modal-overlay" @click.self="closeConfirmModal">
      <div class="modal-content confirm">
        <h3 class="modal-title">확인</h3>
        <p class="modal-message">{{ confirmModalMessage }}</p>
        <div class="modal-buttons">
          <button class="modal-btn cancel" @click="closeConfirmModal">취소</button>
          <button class="modal-btn confirm" @click="handleConfirm">확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-view {
  position: relative;
  z-index: 1;
  width: 100%;
  height: calc(100% - 90px); /* 하단 네비게이션 공간 제외 */
  padding: 20px 20px 0; 
  box-sizing: border-box;
  overflow: hidden; /* 부모 스크롤 제거 */
  display: flex;
  flex-direction: column;
}

.header-logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
  margin-top: 10px;
  position: relative; /* 버튼 절대 위치 기준 */
}

.header-logo {
  max-width: 180px; /* 로고 크기 살짝 줄임 */
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
}

.header-sort-buttons {
  position: absolute;
  right: 0;
  display: flex;
  flex-direction: column; /* [NEW] 세로 배치 */
  gap: 6px;
  align-items: flex-end; /* 오른쪽 정렬 */
}

.header-filter-btn {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #ddd;
  width: 32px; /* [NEW] 고정 너비 */
  height: 32px; /* [NEW] 고정 높이 */
  padding: 0; /* 패딩 제거하고 flex로 중앙 정렬 */
  border-radius: 50%; /* 원형 버튼 */
  font-size: 1.0rem; /* 이모지 크기 */
  display: flex; /* 중앙 정렬 */
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  transition: all 0.2s;
  backdrop-filter: blur(4px);
}

.header-filter-btn.active {
  background: #7e57c2;
  color: white;
  border-color: #7e57c2;
  box-shadow: 0 2px 6px rgba(126, 87, 194, 0.3);
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-bottom: 20px;
}

.tab-btn {
  border: none;
  background: #f0f0f0;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: bold;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active-all {
  background: #26a69a; /* 청녹색 (Teal) */
  color: white;
  box-shadow: 0 4px 10px rgba(38, 166, 154, 0.3);
}

.tab-btn.active {
  background: #7e57c2; /* 공유 관리: 보라색 유지 */
  color: white;
  box-shadow: 0 4px 10px rgba(126, 87, 194, 0.3);
}

.dragon-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-items: start; /* 높이가 달라도 상단 정렬 */
  gap: 60px; /* 데스크탑 간격 확대 */
  row-gap: 100px; /* 세로 간격은 더 확실하게 */
  flex: 1;
  overflow-y: auto;
  overflow-y: auto;
  padding-bottom: 30px;
}

/* .filter-btn.active 스타일은 위에서 이미 정의됨 */

.dragon-list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

.dragon-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 5px 15px rgba(0,0,0,0.05);
  transition: transform 0.2s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  aspect-ratio: 1/1.8; /* 확실하게 길게 늘림 */
  min-height: 240px; /* 최소 높이 보장 */
}

.dragon-card:hover {
  transform: translateY(-5px);
}

.dragon-image {
  width: 100%;
  aspect-ratio: 1.4 / 1; /* 이미지를 더 납작하게 (가로 비율 증가) */
  background: #f8f9fa;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0; /* 이미지 크기 축소 방지 */
}

.dragon-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 12px;
  box-sizing: border-box;
}

.dragon-info {
  padding: 10px;
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  gap: 4px; /* 간격 최적화 */
  overflow: hidden;
}

.dragon-info h3 {
  margin: 4px 0;
  font-size: 0.95rem; /* 제목 크기 약간 조정 */
  color: #333;
  line-height: 1.3;
  word-break: keep-all;
}

.view-count {
  font-size: 0.75rem;
  color: #999;
  margin-top: 2px;
}

.exp-badge {
  display: inline-block;
  background: #fff3e0;
  color: #ef6c00;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: bold;
  margin-bottom: 5px;
}

.desc {
  font-size: 0.8rem;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.my-badge {
  margin-top: 8px;
  font-size: 0.7rem;
  font-weight: bold;
  color: #7e57c2;
  background: #f3e5f5;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

/* 모바일 전용 최적화 */
@media (max-width: 480px) {
  .dragon-grid {
    gap: 20px; /* 가로 간격 */
    row-gap: 100px; /* 모바일에서도 세로 간격 확실하게 (사용자 요청 반영) */
  }
  
  .dragon-info {
    padding: 10px 8px 12px;
    gap: 4px;
  }
  
  .dragon-info h3 {
    font-size: 0.9rem; /* 폰트 사이즈 미세 조정 */
  }
  
  .exp-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    margin-bottom: 3px;
  }

  .desc {
    font-size: 0.75rem;
  }
}

.dragon-card {
  cursor: pointer;
}

.manage-row {
  display: flex;
  align-items: center;
  background: white;
  padding: 10px;
  border-radius: 12px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
}

.thumb {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: contain;
  background: #f9f9f9;
  border: 1px solid #eee;
  margin-right: 15px;
}

.row-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-info .name {
  font-weight: bold;
  color: #333;
}

.row-info .sub {
  font-size: 0.8rem;
  color: #888;
}

.action-btn {
  border: none;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
}

.action-btn.share {
  background: #e1bee7;
  color: #7b1fa2;
}

.action-btn.cancel {
  background: #ffcdd2;
  color: #c62828;
}

.loading, .empty-state {
  grid-column: span 2;
  text-align: center;
  padding: 40px 0;
  color: #aaa;
  font-size: 0.9rem;
}

/* 모달 스타일 (공통 스타일 유지) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 5000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  width: 85%;
  max-width: 320px;
  padding: 30px 20px;
  border-radius: 25px;
  text-align: center;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-title {
  margin: 0 0 15px;
  font-size: 1.2rem;
  font-weight: 900;
  color: #3e2723;
}

.modal-message {
  font-size: 0.95rem;
  color: #5d4037;
  line-height: 1.5;
  margin-bottom: 25px;
  word-break: keep-all;
}

.modal-message.success { color: #2e7d32; }
.modal-message.error { color: #c62828; }

.modal-close-btn {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background-color: #7e57c2;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.modal-buttons {
  display: flex;
  gap: 10px;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-weight: bold;
  cursor: pointer;
}

.modal-btn.cancel {
  background-color: #f5f5f5;
  color: #757575;
}

.modal-btn.confirm {
  background-color: #7e57c2;
  color: white;
}
</style>
