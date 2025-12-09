// 전역 변수
let currentMovies = [];

document.addEventListener('DOMContentLoaded', () => {
    // --- 요소 선택 ---
    const splashScreen = document.getElementById('splash-screen');
    const dashboardScreen = document.getElementById('dashboard-screen');
    const newsScreen = document.getElementById('news-screen'); 

    const startButton = document.getElementById('start-button');
    const newsButton = document.getElementById('news-button'); 
    const backToHomeDash = document.getElementById('back-to-home-from-dash'); 
    const backToHomeNews = document.getElementById('back-to-home-from-news'); 

    const datePicker = document.getElementById('date-picker');
    const lookupButton = document.getElementById('lookup-button');
    
    // 모달 요소들
    const devInfoTrigger = document.getElementById('dev-info-trigger');
    const devInfoModal = document.getElementById('dev-info-modal');
    const devModalCloseBtn = document.getElementById('modal-close-button');
    const movieGrid = document.getElementById('movie-grid');
    const movieDetailModal = document.getElementById('movie-detail-modal');
    const reviewForm = document.getElementById('review-form');
    const reviewList = document.getElementById('review-list');

    // --- 초기 설정: 날짜 ---
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    datePicker.value = yesterday.toISOString().split('T')[0];

    // --- 화면 전환 헬퍼 함수 ---
    function showScreen(screenId) {
        splashScreen.classList.remove('active');
        dashboardScreen.classList.remove('active');
        newsScreen.classList.remove('active');
        document.getElementById(screenId).classList.add('active');
    }

    // --- ✅ [신규] 모달 애니메이션 헬퍼 함수 ---
    function openModalWithAnimation(modal) {
        modal.style.display = 'flex'; // 일단 보이게 함
        // 브라우저가 display 변경을 인식하도록 아주 잠깐 대기 후 클래스 추가 (안정성)
        requestAnimationFrame(() => {
            modal.classList.add('open');
            modal.classList.remove('closing');
        });
    }

    function closeModalWithAnimation(modal) {
        modal.classList.add('closing'); // 닫기 애니메이션 시작
        modal.classList.remove('open');
        
        // 애니메이션 시간(0.3s)만큼 기다린 후 실제로 숨김
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('closing');
        }, 280); 
    }

    // --- 이벤트 리스너 ---

    // 1. [대시보드 시작하기] 버튼 클릭
    startButton.addEventListener('click', async () => {
        const loadingSpinner = document.querySelector('.loading-spinner');
        const loadingMessage = document.querySelector('.loading-message');
        const errorMessage = document.querySelector('.error-message');
        
        startButton.parentElement.style.display = 'none'; 
        loadingSpinner.style.display = 'block';
        loadingMessage.style.display = 'block';
        errorMessage.style.display = 'none';

        const success = await fetchDataAndUpdateUI('/api/boxoffice');

        loadingSpinner.style.display = 'none';
        loadingMessage.style.display = 'none';
        startButton.parentElement.style.display = 'flex'; 

        if (success) {
            showScreen('dashboard-screen'); 
        } else {
            errorMessage.textContent = '데이터를 불러오는 데 실패했습니다.';
            errorMessage.style.display = 'block';
        }
    });

    // 2. [최신 영화 뉴스 보기] 버튼 클릭
    newsButton.addEventListener('click', () => {
        showScreen('news-screen'); 
        fetchAndDisplayNews();     
    });

    // 3. [홈으로 가기] 버튼들
    backToHomeDash.addEventListener('click', () => { showScreen('splash-screen'); });
    backToHomeNews.addEventListener('click', () => { showScreen('splash-screen'); });

    // 4. 날짜 조회
    lookupButton.addEventListener('click', async () => {
        const selectedDate = datePicker.value;
        if (!selectedDate) { alert('날짜를 선택해주세요.'); return; }
        
        const indicator = document.getElementById('loading-indicator');
        indicator.style.display = 'block';
        
        const success = await fetchDataAndUpdateUI(`/api/boxoffice/${selectedDate}`);
        if (!success) alert('데이터 로드 실패');
        
        indicator.style.display = 'none';
    });

    // 5. 모달 관련 이벤트 (개발자 정보, 영화 상세)
    
    // 개발자 정보 모달 열기/닫기 (애니메이션 적용)
    devInfoTrigger.addEventListener('click', (e) => { 
        e.preventDefault(); 
        openModalWithAnimation(devInfoModal); 
    });
    devModalCloseBtn.addEventListener('click', () => { 
        closeModalWithAnimation(devInfoModal); 
    });
    // 배경 클릭 시 닫기
    devInfoModal.addEventListener('click', (e) => { 
        if (e.target === devInfoModal) closeModalWithAnimation(devInfoModal); 
    });

    // 영화 상세 모달 열기
    movieGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.movie-card');
        if (card) {
            const clickedMovieCd = card.dataset.movieCd;
            const movieData = currentMovies.find(m => m.movie_cd === clickedMovieCd);
            if (movieData) {
                // 데이터 채우기
                fillMovieDetailModal(movieData);
                // 애니메이션과 함께 열기
                openModalWithAnimation(movieDetailModal);
            }
        }
    });

    // 영화 상세 모달 닫기
    movieDetailModal.querySelector('.modal-close-btn').addEventListener('click', () => { 
        closeModalWithAnimation(movieDetailModal); 
    });
    movieDetailModal.addEventListener('click', (e) => { 
        if (e.target === movieDetailModal) closeModalWithAnimation(movieDetailModal); 
    });


    // 6. 리뷰 등록 (Create)
    reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const movieCd = movieDetailModal.dataset.currentMovieCd;
        const author = document.getElementById('review-author').value;
        const content = document.getElementById('review-content').value;
        const rating = document.getElementById('review-rating').value;

        try {
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ movie_cd: movieCd, author, content, rating: parseInt(rating) })
            });
            if (!response.ok) throw new Error('Failed');
            const newReview = await response.json();
            
            const list = document.getElementById('review-list');
            const noMsg = list.querySelector('p');
            if (noMsg && noMsg.textContent.includes('없습니다')) noMsg.remove();
            
            list.insertAdjacentElement('afterbegin', createReviewItemElement(newReview));
            reviewForm.reset();
        } catch (err) {
            alert('리뷰 등록 실패');
            console.error(err);
        }
    });

    // 7. 리뷰 삭제 및 수정 버튼 클릭
    reviewList.addEventListener('click', async (e) => {
        const reviewItem = e.target.closest('.review-item');
        if (!reviewItem) return;
        const reviewId = reviewItem.dataset.reviewId;

        if (e.target.classList.contains('delete-review-btn')) {
            if(!confirm('정말 삭제하시겠습니까?')) return;
            try {
                const res = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
                if(res.ok) reviewItem.remove();
            } catch(err) { console.error(err); alert('삭제 실패'); }
        }

        if (e.target.classList.contains('edit-review-btn')) {
            toggleEditMode(reviewItem, true);
        }

        if (e.target.classList.contains('btn-cancel')) {
            toggleEditMode(reviewItem, false);
            const form = reviewItem.querySelector('.review-edit-form');
            form.querySelector('.edit-content').value = reviewItem.dataset.content;
            form.querySelector('.edit-rating').value = reviewItem.dataset.rating;
        }

        if (e.target.classList.contains('btn-save')) {
            const form = reviewItem.querySelector('.review-edit-form');
            const newContent = form.querySelector('.edit-content').value;
            const newRating = form.querySelector('.edit-rating').value;

            try {
                const response = await fetch(`/api/reviews/${reviewId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: newContent,
                        rating: parseInt(newRating)
                    })
                });
                if (!response.ok) throw new Error('수정 실패');
                const updatedReview = await response.json(); 
                updateReviewInDOM(reviewItem, updatedReview);
                toggleEditMode(reviewItem, false);
            } catch (error) {
                console.error(error);
                alert('리뷰 수정에 실패했습니다.');
            }
        }
    });

});

// --- 헬퍼 함수들 ---

async function fetchDataAndUpdateUI(apiUrl) {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            if (response.status === 404) {
                 const d = await response.json(); alert(d.error);
            }
            return false;
        }
        const data = await response.json();
        currentMovies = data.movies;
        document.getElementById('data-date').textContent = `데이터 기준: ${data.target_dt}`;
        createMovieCards(data.movies);
        createAudienceChart(data.movies);
        return true; 
    } catch (error) {
        console.error(error); return false; 
    }
}

async function fetchAndDisplayNews() {
    const listEl = document.getElementById('full-news-list');
    listEl.innerHTML = '<li style="text-align:center;">뉴스를 불러오는 중...</li>';

    try {
        const response = await fetch('/api/news');
        const newsData = await response.json();
        listEl.innerHTML = '';

        if (!newsData || newsData.length === 0) {
            listEl.innerHTML = '<li style="text-align:center;">뉴스 데이터가 없습니다.</li>';
            return;
        }

        newsData.forEach(news => {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="${news.link}" target="_blank">
                    <span class="news-title">${news.title}</span>
                    <span class="news-meta">
                        <span class="news-source">${news.source}</span>
                        <span>${news.date ? news.date.substring(0, 16) : ''}</span>
                    </span>
                </a>
            `;
            listEl.appendChild(li);
        });
    } catch (error) {
        listEl.innerHTML = '<li style="text-align:center; color:red;">로드 실패</li>';
    }
}

function createMovieCards(movies) {
    const grid = document.getElementById('movie-grid');
    grid.innerHTML = ''; 
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.movieCd = movie.movie_cd; 
        card.innerHTML = `
            <img src="${movie.poster_url}" alt="${movie.movie_nm}" onerror="this.onerror=null;this.src='/static/no-image.png';">
            <div class="movie-info">
                <h3><span class="rank">${movie.rank}</span> ${movie.movie_nm}</h3>
                <p>⭐️ ${movie.tmdb_rating ? parseFloat(movie.tmdb_rating).toFixed(1) : 'N/A'}</p>
                <p>${movie.audi_acc ? movie.audi_acc.toLocaleString() : '0'}명</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function createAudienceChart(movies) {
    const ctx = document.getElementById('audienceChart').getContext('2d');
    const existing = Chart.getChart('audienceChart');
    if (existing) existing.destroy();

    new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: movies.map(m => m.movie_nm),
            datasets: [{
                label: '관객수',
                data: movies.map(m => m.audi_acc),
                backgroundColor: 'rgba(76, 175, 80, 0.7)',
                borderColor: 'rgba(76, 175, 80, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y', 
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true } }
        }
    });
}

// ✅ [분리] 모달 데이터 채우는 함수
function fillMovieDetailModal(movie) {
    const modal = document.getElementById('movie-detail-modal');
    modal.dataset.currentMovieCd = movie.movie_cd;
    document.getElementById('modal-poster').src = movie.poster_url || '/static/no-image.png';
    document.getElementById('modal-title').textContent = movie.movie_nm;
    document.querySelector('#movie-detail-modal .modal-rating').textContent = `⭐️ ${movie.tmdb_rating ? parseFloat(movie.tmdb_rating).toFixed(1) : 'N/A'}`;
    document.querySelector('#movie-detail-modal .modal-audience').textContent = `누적 관객: ${movie.audi_acc ? movie.audi_acc.toLocaleString() : '0'}명`;
    document.getElementById('modal-overview').textContent = movie.overview || '정보 없음';
    loadReviews(movie.movie_cd);
}

function openMovieDetailModal(movie) {
    // 이제 이 함수는 위에서 이벤트 리스너 내에서 직접 호출되는 openModalWithAnimation 으로 대체됩니다.
    // 하지만 호환성을 위해 남겨두거나, fillMovieDetailModal 로 분리하는 것이 좋습니다.
    // 여기서는 fillMovieDetailModal만 남기고 삭제해도 되지만, 안전하게 위에서 직접 호출하도록 로직을 변경했습니다.
}

async function loadReviews(movieCd) {
    const list = document.getElementById('review-list');
    list.innerHTML = '로딩 중...';
    try {
        const res = await fetch(`/api/reviews/${movieCd}`);
        const reviews = await res.json();
        list.innerHTML = '';
        if(reviews.length === 0) { list.innerHTML = '<p>작성된 리뷰가 없습니다.</p>'; return; }
        reviews.forEach(r => list.appendChild(createReviewItemElement(r)));
    } catch(e) { list.innerHTML = '로드 실패'; }
}

function createReviewItemElement(review) {
    const div = document.createElement('div');
    div.className = 'review-item';
    div.dataset.reviewId = review.review_id;
    div.dataset.content = review.content;
    div.dataset.rating = review.rating;
    div.dataset.author = review.author || '익명';

    const stars = review.rating ? '⭐️'.repeat(review.rating) : '';
    const dateStr = new Date(review.created_at).toLocaleString('ko-KR');

    div.innerHTML = `
        <div class="review-display">
            <div class="review-item-header">
                <div>
                    <span class="author">${review.author||'익명'}</span>
                    <span class="rating">${stars}</span>
                </div>
                <div class="controls">
                    <button class="edit-review-btn" title="수정">수정</button>
                    <button class="delete-review-btn" title="삭제">&times;</button>
                </div>
            </div>
            <p>${review.content}</p>
            <span class="date">${dateStr}</span>
        </div>

        <div class="review-edit-form" style="display: none;">
            <div class="form-group">
                <textarea class="edit-content" required>${review.content}</textarea>
            </div>
            <div class="form-group">
                <select class="edit-rating" required>
                    <option value="5" ${review.rating == 5 ? 'selected' : ''}>⭐️⭐️⭐️⭐️⭐️</option>
                    <option value="4" ${review.rating == 4 ? 'selected' : ''}>⭐️⭐️⭐️⭐️</option>
                    <option value="3" ${review.rating == 3 ? 'selected' : ''}>⭐️⭐️⭐️</option>
                    <option value="2" ${review.rating == 2 ? 'selected' : ''}>⭐️⭐️</option>
                    <option value="1" ${review.rating == 1 ? 'selected' : ''}>⭐️</option>
                </select>
                <div class="edit-actions">
                    <button class="btn-cancel">취소</button>
                    <button class="btn-save">저장</button>
                </div>
            </div>
        </div>
    `;
    return div;
}

function toggleEditMode(reviewItem, isEditMode) {
    const displayElement = reviewItem.querySelector('.review-display');
    const editFormElement = reviewItem.querySelector('.review-edit-form');

    if (isEditMode) {
        displayElement.style.display = 'none';
        editFormElement.style.display = 'flex'; 
    } else {
        displayElement.style.display = 'block';
        editFormElement.style.display = 'none';
    }
}

function updateReviewInDOM(reviewItem, updatedReview) {
    reviewItem.dataset.content = updatedReview.content;
    reviewItem.dataset.rating = updatedReview.rating;
    const displayElement = reviewItem.querySelector('.review-display');
    const ratingStars = updatedReview.rating ? '⭐️'.repeat(updatedReview.rating) : '';
    displayElement.querySelector('.rating').textContent = ratingStars;
    displayElement.querySelector('p').textContent = updatedReview.content;
    const formElement = reviewItem.querySelector('.review-edit-form');
    formElement.querySelector('.edit-content').value = updatedReview.content;
    formElement.querySelector('.edit-rating').value = updatedReview.rating;
}