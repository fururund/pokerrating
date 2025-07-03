// パスワード認証クラス
class PasswordAuth {
    constructor() {
        this.correctPassword = 'card2025'; // パスワードを設定（実際の運用では環境変数等で管理）
        this.sessionKey = 'rating_system_auth';
        this.init();
    }

    init() {
        // セッション確認
        if (this.isAuthenticated()) {
            this.showMainContent();
        } else {
            this.showPasswordModal();
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        // パスワード送信ボタン
        document.getElementById('password-submit-btn').addEventListener('click', () => {
            this.validatePassword();
        });

        // Enterキーでパスワード送信
        document.getElementById('password-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.validatePassword();
            }
        });

        // モーダル外クリックを無効化
        document.getElementById('password-modal').addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    validatePassword() {
        const inputPassword = document.getElementById('password-input').value;
        const errorElement = document.getElementById('password-error');

        if (inputPassword === this.correctPassword) {
            // 認証成功
            this.setAuthenticated();
            this.hidePasswordModal();
            this.showMainContent();
            this.initRatingSystem();
        } else {
            // 認証失敗
            errorElement.style.display = 'block';
            document.getElementById('password-input').value = '';
            document.getElementById('password-input').focus();
            
            // エラーメッセージを一定時間後に非表示
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 3000);
        }
    }

    isAuthenticated() {
        const authTime = localStorage.getItem(this.sessionKey);
        if (!authTime) return false;
        
        // 24時間でセッション期限切れ
        const expiryTime = 24 * 60 * 60 * 1000; // 24時間
        return (Date.now() - parseInt(authTime)) < expiryTime;
    }

    setAuthenticated() {
        localStorage.setItem(this.sessionKey, Date.now().toString());
    }

    showPasswordModal() {
        document.getElementById('password-modal').style.display = 'flex';
        document.getElementById('main-container').style.display = 'none';
        document.getElementById('password-input').focus();
    }

    hidePasswordModal() {
        document.getElementById('password-modal').style.display = 'none';
    }

    showMainContent() {
        document.getElementById('main-container').style.display = 'block';
    }

    initRatingSystem() {
        // レーティングシステムを初期化
        if (!window.ratingSystem) {
            window.ratingSystem = new RatingSystem();
            // グローバル変数も設定
            ratingSystem = window.ratingSystem;
        }
    }

    // ログアウト機能
    logout() {
        localStorage.removeItem(this.sessionKey);
        location.reload();
    }
}

// レーティングシステムクラス
class RatingSystem {
    constructor() {
        this.players = JSON.parse(localStorage.getItem('players')) || [];
        this.matches = JSON.parse(localStorage.getItem('matches')) || [];
        this.init();
    }

    // 初期化
    init() {
        this.setupEventListeners();
        this.updateDisplay();
    }

    // イベントリスナーの設定
    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // プレイヤー追加
        document.getElementById('add-player-btn').addEventListener('click', () => {
            this.addPlayer();
        });

        // 対戦記録
        document.getElementById('record-match-btn').addEventListener('click', () => {
            this.recordMatch();
        });

        // データ管理
        document.getElementById('export-btn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('import-btn').addEventListener('click', () => {
            document.getElementById('import-file').click();
        });

        document.getElementById('import-file').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        document.getElementById('clear-data-btn').addEventListener('click', () => {
            this.clearData();
        });

        // チャート用プレイヤー選択
        document.getElementById('player-select-chart').addEventListener('change', (e) => {
            this.updateChart(e.target.value);
        });

        // 最後の対戦を取り消し
        document.getElementById('undo-last-match-btn').addEventListener('click', () => {
            this.undoLastMatch();
        });

        // 対戦履歴表示件数変更
        document.getElementById('history-count-select').addEventListener('change', () => {
            this.updateMatchHistory();
        });

        // 全履歴削除
        document.getElementById('clear-all-matches-btn').addEventListener('click', () => {
            this.clearAllMatches();
        });

        // ログアウト
        document.getElementById('logout-btn').addEventListener('click', () => {
            if (window.passwordAuth) {
                window.passwordAuth.logout();
            }
        });
    }

    // タブ切り替え
    switchTab(tabName) {
        // ナビゲーションボタンの更新
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // タブコンテンツの更新
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // 必要に応じて表示を更新
        if (tabName === 'leaderboard') {
            this.updateLeaderboard();
        } else if (tabName === 'statistics') {
            this.updateStatistics();
        } else if (tabName === 'match') {
            this.updatePlayerSelection();
        }
    }

    // プレイヤー追加
    addPlayer() {
        const nameInput = document.getElementById('player-name');
        const ratingInput = document.getElementById('initial-rating');
        
        const name = nameInput.value.trim();
        const rating = parseInt(ratingInput.value) || 1500;

        if (!name) {
            alert('プレイヤー名を入力してください。');
            return;
        }

        if (this.players.find(p => p.name === name)) {
            alert('同じ名前のプレイヤーが既に存在します。');
            return;
        }

        const player = {
            id: Date.now().toString(),
            name: name,
            rating: rating,
            initialRating: rating,
            gamesPlayed: 0,
            wins: 0,
            ratingHistory: [{
                rating: rating,
                date: new Date().toISOString(),
                matchId: null
            }]
        };

        this.players.push(player);
        this.saveData();
        this.updateDisplay();

        nameInput.value = '';
        ratingInput.value = '1500';
    }

    // プレイヤー削除
    removePlayer(playerId) {
        if (confirm('このプレイヤーを削除しますか？対戦履歴も削除されます。')) {
            this.players = this.players.filter(p => p.id !== playerId);
            this.matches = this.matches.filter(m => !m.players.some(p => p.id === playerId));
            this.saveData();
            this.updateDisplay();
        }
    }

    // 対戦記録
    recordMatch() {
        const selectedPlayers = this.getSelectedPlayers();
        const rankings = this.getRankings();

        if (selectedPlayers.length < 3 || selectedPlayers.length > 8) {
            alert('3-8人のプレイヤーを選択してください。');
            return;
        }

        if (rankings.length !== selectedPlayers.length || 
            rankings.some(rank => rank < 1 || rank > selectedPlayers.length)) {
            alert('正しい順位を入力してください。');
            return;
        }

        // 重複順位チェック
        const uniqueRanks = [...new Set(rankings)];
        if (uniqueRanks.length !== rankings.length) {
            // 同率順位がある場合の警告
            if (!confirm('同率順位が含まれています。続行しますか？')) {
                return;
            }
        }

        // 対戦記録の作成
        const match = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            players: selectedPlayers.map((player, index) => ({
                id: player.id,
                name: player.name,
                oldRating: player.rating,
                rank: rankings[index]
            }))
        };

        // レート計算
        this.calculateNewRatings(match);
        
        // 対戦記録を保存
        this.matches.unshift(match);
        this.saveData();
        this.updateDisplay();

        // フォームをリセット
        this.resetMatchForm();
        alert('対戦記録が追加されました！');
    }

    // 選択されたプレイヤーを取得
    getSelectedPlayers() {
        const checkboxes = document.querySelectorAll('.player-selection input[type="checkbox"]:checked');
        return Array.from(checkboxes).map(cb => {
            const playerId = cb.value;
            return this.players.find(p => p.id === playerId);
        });
    }

    // 順位を取得
    getRankings() {
        const selectedPlayers = this.getSelectedPlayers();
        const rankings = [];
        
        selectedPlayers.forEach(player => {
            const rank = this.playerRankings[player.id] || 0;
            rankings.push(rank);
        });
        
        return rankings;
    }

    // イロレーティング計算（ペアワイズ方式）
    calculateNewRatings(match) {
        const players = match.players;
        const newRatings = {};

        // 各プレイヤーの初期レートを設定
        players.forEach(player => {
            newRatings[player.id] = player.oldRating;
        });

        // ペアワイズ比較で各組み合わせを計算
        for (let i = 0; i < players.length; i++) {
            for (let j = i + 1; j < players.length; j++) {
                const player1 = players[i];
                const player2 = players[j];

                // 対戦結果を判定
                let score1, score2;
                if (player1.rank < player2.rank) {
                    score1 = 1; score2 = 0; // player1の勝利
                } else if (player1.rank > player2.rank) {
                    score1 = 0; score2 = 1; // player2の勝利
                } else {
                    score1 = 0.5; score2 = 0.5; // 引き分け
                }

                // 期待スコア計算
                const expected1 = this.getExpectedScore(player1.oldRating, player2.oldRating);
                const expected2 = 1 - expected1;

                // K因子の決定
                const k1 = this.getKFactor(player1.oldRating, this.getPlayerGamesPlayed(player1.id));
                const k2 = this.getKFactor(player2.oldRating, this.getPlayerGamesPlayed(player2.id));

                // レート更新
                const ratingChange1 = k1 * (score1 - expected1);
                const ratingChange2 = k2 * (score2 - expected2);

                newRatings[player1.id] += ratingChange1;
                newRatings[player2.id] += ratingChange2;
            }
        }

        // 計算結果をプレイヤーデータに反映
        players.forEach(player => {
            const playerData = this.players.find(p => p.id === player.id);
            const newRating = Math.round(newRatings[player.id]);
            
            player.newRating = newRating;
            player.ratingChange = newRating - player.oldRating;
            
            playerData.rating = newRating;
            playerData.gamesPlayed++;
            
            // 勝利数更新（1位の場合）
            if (player.rank === 1) {
                playerData.wins++;
            }

            // レート履歴追加
            playerData.ratingHistory.push({
                rating: newRating,
                date: match.date,
                matchId: match.id,
                ratingChange: player.ratingChange
            });
        });
    }

    // 期待スコア計算
    getExpectedScore(rating1, rating2) {
        return 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
    }

    // K因子の決定
    getKFactor(rating, gamesPlayed) {
        if (gamesPlayed < 10) return 32; // 新規プレイヤー
        if (rating < 2100) return 16; // 中堅プレイヤー
        return 8; // 上級プレイヤー
    }

    // プレイヤーの対戦数取得
    getPlayerGamesPlayed(playerId) {
        const player = this.players.find(p => p.id === playerId);
        return player ? player.gamesPlayed : 0;
    }

    // 表示更新
    updateDisplay() {
        this.updatePlayersList();
        this.updatePlayerSelection();
        this.updateLeaderboard();
        this.updateMatchHistory();
        this.updatePlayerSelectChart();
    }

    // プレイヤーリスト更新
    updatePlayersList() {
        const container = document.getElementById('players-list');
        
        if (this.players.length === 0) {
            container.innerHTML = '<p>プレイヤーが登録されていません。</p>';
            return;
        }

        container.innerHTML = this.players.map(player => `
            <div class="player-card">
                <h3>${player.name}</h3>
                <div class="player-stats">
                    <div>レート: <strong>${player.rating}</strong></div>
                    <div>対戦数: ${player.gamesPlayed}</div>
                    <div>勝利数: ${player.wins}</div>
                    <div>勝率: ${player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0}%</div>
                </div>
                <div class="player-actions">
                    <button onclick="ratingSystem.removePlayer('${player.id}')" class="danger">削除</button>
                </div>
            </div>
        `).join('');
    }

    // プレイヤー選択エリア更新
    updatePlayerSelection() {
        const container = document.getElementById('player-selection');
        
        if (this.players.length < 3) {
            container.innerHTML = '<p>対戦を記録するには3人以上のプレイヤーが必要です。</p>';
            document.getElementById('ranking-input').innerHTML = '';
            return;
        }

        container.innerHTML = this.players.map(player => `
            <label class="player-checkbox">
                <input type="checkbox" value="${player.id}" onchange="ratingSystem.onPlayerSelectionChange()">
                <span>${player.name} (${player.rating})</span>
            </label>
        `).join('');

        this.onPlayerSelectionChange();
    }

    // プレイヤー選択変更時
    onPlayerSelectionChange() {
        const selectedPlayers = this.getSelectedPlayers();
        const rankingContainer = document.getElementById('ranking-input');

        // 選択状態の視覚的更新
        document.querySelectorAll('.player-checkbox').forEach(checkbox => {
            const input = checkbox.querySelector('input');
            if (input.checked) {
                checkbox.classList.add('selected');
            } else {
                checkbox.classList.remove('selected');
            }
        });

        if (selectedPlayers.length === 0) {
            rankingContainer.innerHTML = '';
            return;
        }

        // 順位入力エリア生成（各プレイヤーに全順位ボタン）
        rankingContainer.innerHTML = `
            <div class="ranking-instructions">
                <p>各プレイヤーの順位ボタンをクリックして順位を設定してください</p>
                <div class="ranking-controls">
                    <button onclick="ratingSystem.resetRanking()" class="reset-rank-btn">リセット</button>
                </div>
            </div>
            <div class="ranking-area">
                ${selectedPlayers.map((player, index) => `
                    <div class="rank-item" data-player-id="${player.id}">
                        <div class="player-info">
                            <span class="player-name">${player.name}</span>
                            <span class="player-rating">(${player.rating})</span>
                        </div>
                        <div class="rank-buttons">
                            ${Array.from({length: selectedPlayers.length}, (_, i) => i + 1).map(rank => `
                                <button
                                    onclick="ratingSystem.setPlayerRank('${player.id}', ${rank})"
                                    class="rank-btn"
                                    id="rank-btn-${player.id}-${rank}"
                                    data-rank="${rank}"
                                >
                                    ${rank}位
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="ranking-status">
                <span id="ranking-progress">0 / ${selectedPlayers.length} 人の順位が決まっています</span>
            </div>
        `;
        
        // 順位状態を初期化
        this.playerRankings = {};
    }

    // 対戦フォームリセット
    resetMatchForm() {
        document.querySelectorAll('.player-selection input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        this.playerRankings = {};
        this.currentRankingAssignment = 1;
        this.onPlayerSelectionChange();
    }

    // リーダーボード更新
    updateLeaderboard() {
        const container = document.getElementById('leaderboard');
        
        if (this.players.length === 0) {
            container.innerHTML = '<p>プレイヤーが登録されていません。</p>';
            return;
        }

        const sortedPlayers = [...this.players].sort((a, b) => b.rating - a.rating);
        
        // 上位3位と4位以下を分離
        const top3 = sortedPlayers.slice(0, 3);
        const others = sortedPlayers.slice(3);

        // 表彰台部分
        let podiumHTML = '';
        if (top3.length > 0) {
            // 表彰台の順序: 2位、1位、3位
            const podiumOrder = [];
            if (top3[1]) podiumOrder.push({...top3[1], rank: 2, position: 'left'});   // 2位を左に
            if (top3[0]) podiumOrder.push({...top3[0], rank: 1, position: 'center'}); // 1位を中央に
            if (top3[2]) podiumOrder.push({...top3[2], rank: 3, position: 'right'});  // 3位を右に

            podiumHTML = `
                <div class="podium-container">
                    ${podiumOrder.map(player => `
                        <div class="podium-player ${player.position}">
                            <div class="podium-avatar">
                                <div class="podium-rank rank-${player.rank}">${player.rank}</div>
                                <div class="podium-crown ${player.rank === 1 ? 'gold' : player.rank === 2 ? 'silver' : 'bronze'}">
                                    ${player.rank === 1 ? '👑' : player.rank === 2 ? '🥈' : '🥉'}
                                </div>
                            </div>
                            <div class="podium-info">
                                <div class="podium-name">${player.name}</div>
                                <div class="podium-rating">${player.rating}</div>
                                <div class="podium-stats">
                                    ${player.gamesPlayed}戦 ${player.wins}勝
                                    (${player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0}%)
                                </div>
                            </div>
                            <div class="podium-base podium-${player.rank}"></div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // 4位以下の通常リスト
        let othersHTML = '';
        if (others.length > 0) {
            othersHTML = `
                <div class="other-ranks">
                    ${others.map((player, index) => {
                        const rank = index + 4;
                        return `
                            <div class="leaderboard-item">
                                <div class="rank-badge rank-other">${rank}</div>
                                <div class="player-info">
                                    <div class="player-name">${player.name}</div>
                                    <div class="player-details">
                                        レート: ${player.rating} |
                                        対戦数: ${player.gamesPlayed} |
                                        勝率: ${player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0}%
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        container.innerHTML = podiumHTML + othersHTML;
    }

    // 対戦履歴更新
    updateMatchHistory() {
        const container = document.getElementById('match-history');
        
        if (this.matches.length === 0) {
            container.innerHTML = '<p>対戦履歴がありません。</p>';
            return;
        }

        // 表示件数を取得
        const countSelect = document.getElementById('history-count-select');
        const displayCount = countSelect ? countSelect.value : '5';
        
        // 表示する対戦を決定
        let displayMatches;
        if (displayCount === 'all') {
            displayMatches = this.matches;
        } else {
            const count = parseInt(displayCount);
            displayMatches = this.matches.slice(0, count);
        }

        // 表示件数情報を追加
        const totalMatches = this.matches.length;
        const showingCount = displayMatches.length;
        const countInfo = totalMatches > showingCount ?
            `<div class="match-count-info">表示中: ${showingCount}件 / 全${totalMatches}件</div>` :
            `<div class="match-count-info">全${totalMatches}件</div>`;

        container.innerHTML = countInfo + displayMatches.map((match, index) => {
            const date = new Date(match.date).toLocaleString('ja-JP');
            const playersList = match.players
                .sort((a, b) => a.rank - b.rank)
                .map(player => {
                    const change = player.ratingChange > 0 ? `+${player.ratingChange}` : player.ratingChange;
                    return `<span class="match-player">${player.rank}位: ${player.name} (${change})</span>`;
                }).join('');

            return `
                <div class="match-item">
                    <div class="match-header">
                        <div class="match-date">${date}</div>
                        <div class="match-actions">
                            <button onclick="ratingSystem.undoMatch('${match.id}')" class="undo-btn" title="この対戦を取り消す">
                                ↶ 取り消し
                            </button>
                        </div>
                    </div>
                    <div class="match-players">${playersList}</div>
                </div>
            `;
        }).join('');

        // ボタンの表示制御
        const undoLastBtn = document.getElementById('undo-last-match-btn');
        const clearAllBtn = document.getElementById('clear-all-matches-btn');
        
        if (this.matches.length > 0) {
            undoLastBtn.style.display = 'block';
            clearAllBtn.style.display = 'block';
        } else {
            undoLastBtn.style.display = 'none';
            clearAllBtn.style.display = 'none';
        }
    }

    // 統計情報更新
    updateStatistics() {
        const container = document.getElementById('statistics-info');
        
        if (this.players.length === 0) {
            container.innerHTML = '<p>統計データがありません。</p>';
            return;
        }

        const totalGames = this.matches.length;
        const totalPlayers = this.players.length;
        const avgRating = Math.round(this.players.reduce((sum, p) => sum + p.rating, 0) / totalPlayers);
        const mostActivePlayer = this.players.reduce((max, p) => p.gamesPlayed > max.gamesPlayed ? p : max);
        const highestRated = this.players.reduce((max, p) => p.rating > max.rating ? p : max);

        container.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${totalGames}</div>
                <div class="stat-label">総対戦数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalPlayers}</div>
                <div class="stat-label">登録プレイヤー数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${avgRating}</div>
                <div class="stat-label">平均レート</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${mostActivePlayer.name}</div>
                <div class="stat-label">最多参加プレイヤー<br>(${mostActivePlayer.gamesPlayed}戦)</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${highestRated.name}</div>
                <div class="stat-label">最高レートプレイヤー<br>(${highestRated.rating})</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round((this.players.reduce((sum, p) => sum + p.wins, 0) / Math.max(this.players.reduce((sum, p) => sum + p.gamesPlayed, 0), 1)) * 100)}%</div>
                <div class="stat-label">全体平均勝率</div>
            </div>
        `;
    }

    // チャート用プレイヤー選択更新
    updatePlayerSelectChart() {
        const select = document.getElementById('player-select-chart');
        select.innerHTML = '<option value="">プレイヤーを選択</option>' +
            this.players.map(player => `<option value="${player.id}">${player.name}</option>`).join('');
    }

    // レートチャート更新
    updateChart(playerId) {
        const canvas = document.getElementById('rating-chart');
        const ctx = canvas.getContext('2d');

        // 既存のチャートを削除
        if (this.chart) {
            this.chart.destroy();
        }

        if (!playerId) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const player = this.players.find(p => p.id === playerId);
        if (!player || !player.ratingHistory) {
            return;
        }

        const data = player.ratingHistory.map((entry, index) => ({
            x: index,
            y: entry.rating,
            date: new Date(entry.date).toLocaleDateString('ja-JP')
        }));

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.date),
                datasets: [{
                    label: `${player.name}のレート推移`,
                    data: data.map(d => d.y),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: 20
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            padding: 10
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            padding: 10
                        }
                    }
                },
                elements: {
                    point: {
                        hoverRadius: 8
                    }
                }
            }
        });
        
        // グラフのサイズを強制的に400pxに設定
        canvas.style.height = '400px';
        canvas.style.width = '100%';
    }

    // データ保存
    saveData() {
        localStorage.setItem('players', JSON.stringify(this.players));
        localStorage.setItem('matches', JSON.stringify(this.matches));
    }

    // データエクスポート
    exportData() {
        const data = {
            players: this.players,
            matches: this.matches,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rating-system-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // データインポート
    importData(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.players && data.matches) {
                    if (confirm('現在のデータを上書きしてインポートしますか？')) {
                        this.players = data.players;
                        this.matches = data.matches;
                        this.saveData();
                        this.updateDisplay();
                        alert('データをインポートしました！');
                    }
                } else {
                    alert('無効なファイル形式です。');
                }
            } catch (error) {
                alert('ファイルの読み込みに失敗しました。');
            }
        };
        reader.readAsText(file);
    }

    // データクリア
    clearData() {
        if (confirm('全てのデータを削除しますか？この操作は取り消せません。')) {
            if (confirm('本当に削除しますか？')) {
                this.players = [];
                this.matches = [];
                localStorage.removeItem('players');
                localStorage.removeItem('matches');
                this.updateDisplay();
                alert('全データを削除しました。');
            }
        }
    }

    // 対戦取り消し機能
    undoMatch(matchId) {
        const match = this.matches.find(m => m.id === matchId);
        if (!match) {
            alert('対戦記録が見つかりません。');
            return;
        }

        const matchDate = new Date(match.date).toLocaleString('ja-JP');
        const playerNames = match.players.map(p => p.name).join(', ');
        
        if (!confirm(`${matchDate}の対戦（${playerNames}）を取り消しますか？\n\nこの操作により、参加プレイヤーのレートとレート履歴がこの対戦前の状態に戻ります。`)) {
            return;
        }

        // この対戦に参加したプレイヤーのレートを元に戻す
        match.players.forEach(matchPlayer => {
            const player = this.players.find(p => p.id === matchPlayer.id);
            if (player) {
                // レートを対戦前の値に戻す
                player.rating = matchPlayer.oldRating;
                
                // 対戦数を減らす
                player.gamesPlayed = Math.max(0, player.gamesPlayed - 1);
                
                // 勝利数を調整（1位だった場合）
                if (matchPlayer.rank === 1) {
                    player.wins = Math.max(0, player.wins - 1);
                }
                
                // レート履歴からこの対戦のエントリを削除
                player.ratingHistory = player.ratingHistory.filter(
                    entry => entry.matchId !== matchId
                );
            }
        });

        // この対戦後の全ての対戦のレートを再計算
        this.recalculateRatingsAfterUndo(match.date);

        // 対戦記録を削除
        this.matches = this.matches.filter(m => m.id !== matchId);

        // データを保存して表示を更新
        this.saveData();
        this.updateDisplay();

        alert('対戦記録を取り消しました。レートと履歴が更新されました。');
    }

    // 取り消し後の再計算
    recalculateRatingsAfterUndo(undoDate) {
        // 取り消した対戦以降の対戦を日付順で取得
        const subsequentMatches = this.matches
            .filter(m => new Date(m.date) > new Date(undoDate))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        // 各プレイヤーのレート履歴を取り消し対戦以前まで巻き戻す
        this.players.forEach(player => {
            player.ratingHistory = player.ratingHistory.filter(
                entry => !entry.matchId || new Date(entry.date) <= new Date(undoDate)
            );
            
            // 最新のレート履歴からレートを復元
            if (player.ratingHistory.length > 0) {
                const lastEntry = player.ratingHistory[player.ratingHistory.length - 1];
                player.rating = lastEntry.rating;
            }

            // 対戦数と勝利数を再計算
            const validMatches = this.matches.filter(m =>
                new Date(m.date) <= new Date(undoDate) &&
                m.players.some(p => p.id === player.id)
            );
            player.gamesPlayed = validMatches.length;
            player.wins = validMatches.filter(m => {
                const playerInMatch = m.players.find(p => p.id === player.id);
                return playerInMatch && playerInMatch.rank === 1;
            }).length;
        });

        // 後続の対戦を順番に再計算
        subsequentMatches.forEach(match => {
            // 対戦時点でのプレイヤーの旧レートを更新
            match.players.forEach(matchPlayer => {
                const player = this.players.find(p => p.id === matchPlayer.id);
                if (player) {
                    matchPlayer.oldRating = player.rating;
                }
            });

            // レートを再計算
            this.calculateNewRatings(match);

            // 対戦履歴を更新（既存のエントリがあれば削除してから追加）
            match.players.forEach(matchPlayer => {
                const player = this.players.find(p => p.id === matchPlayer.id);
                if (player) {
                    // この対戦のエントリを削除
                    player.ratingHistory = player.ratingHistory.filter(
                        entry => entry.matchId !== match.id
                    );
                    
                    // 新しいエントリを追加
                    player.ratingHistory.push({
                        rating: matchPlayer.newRating,
                        date: match.date,
                        matchId: match.id,
                        ratingChange: matchPlayer.ratingChange
                    });
                }
            });
        });
    }

    // 最後の対戦を取り消し
    undoLastMatch() {
        if (this.matches.length === 0) {
            alert('取り消す対戦記録がありません。');
            return;
        }

        const lastMatch = this.matches[0]; // 最新の対戦（配列の最初）
        this.undoMatch(lastMatch.id);
    }

    // 全対戦履歴削除
    clearAllMatches() {
        if (this.matches.length === 0) {
            alert('削除する対戦履歴がありません。');
            return;
        }

        const totalMatches = this.matches.length;
        const matchesSummary = totalMatches > 5 ?
            `${totalMatches}件の対戦履歴` :
            this.matches.slice(0, 5).map(m =>
                new Date(m.date).toLocaleDateString('ja-JP')
            ).join(', ');

        if (!confirm(`全ての対戦履歴（${totalMatches}件）を削除しますか？\n\nこの操作により、全プレイヤーのレート、対戦数、勝利数、レート履歴が初期状態に戻ります。\n\nこの操作は取り消せません。`)) {
            return;
        }

        if (!confirm('本当に全ての対戦履歴を削除しますか？')) {
            return;
        }

        // 全プレイヤーを初期状態に戻す
        this.players.forEach(player => {
            // レートを初期レートに戻す
            player.rating = player.initialRating;
            
            // 対戦数と勝利数をリセット
            player.gamesPlayed = 0;
            player.wins = 0;
            
            // レート履歴を初期状態にリセット
            player.ratingHistory = [{
                rating: player.initialRating,
                date: player.ratingHistory[0]?.date || new Date().toISOString(),
                matchId: null
            }];
        });

        // 対戦履歴を全削除
        this.matches = [];

        // データを保存して表示を更新
        this.saveData();
        this.updateDisplay();

        alert(`${totalMatches}件の対戦履歴を削除しました。全プレイヤーが初期状態に戻りました。`);
    }

    // 順位設定機能（新方式）
    setPlayerRank(playerId, rank) {
        // 既に同じプレイヤーが同じ順位を選択している場合は取り消し
        if (this.playerRankings[playerId] === rank) {
            delete this.playerRankings[playerId];
            this.updateRankingDisplay();
            return;
        }

        // 既に同じ順位が他のプレイヤーに設定されている場合はクリア
        const existingPlayer = Object.keys(this.playerRankings).find(id => this.playerRankings[id] === rank);
        if (existingPlayer && existingPlayer !== playerId) {
            delete this.playerRankings[existingPlayer];
        }

        // 順位を設定
        this.playerRankings[playerId] = rank;

        this.updateRankingDisplay();
    }

    // プレイヤー名を取得
    getPlayerName(playerId) {
        const player = this.players.find(p => p.id === playerId);
        return player ? player.name : '';
    }

    // 順位表示を更新
    updateRankingDisplay() {
        const selectedPlayers = this.getSelectedPlayers();
        
        // 全てのボタンをリセット
        selectedPlayers.forEach(player => {
            for (let rank = 1; rank <= selectedPlayers.length; rank++) {
                const btn = document.getElementById(`rank-btn-${player.id}-${rank}`);
                if (btn) {
                    btn.className = 'rank-btn';
                    btn.disabled = false;
                }
            }
        });

        // 設定済みの順位をハイライト
        Object.keys(this.playerRankings).forEach(playerId => {
            const rank = this.playerRankings[playerId];
            const btn = document.getElementById(`rank-btn-${playerId}-${rank}`);
            if (btn) {
                btn.className = 'rank-btn selected';
            }
        });

        // 既に使用されている順位のボタンを無効化
        const usedRanks = Object.values(this.playerRankings);
        selectedPlayers.forEach(player => {
            for (let rank = 1; rank <= selectedPlayers.length; rank++) {
                const btn = document.getElementById(`rank-btn-${player.id}-${rank}`);
                if (btn && usedRanks.includes(rank) && this.playerRankings[player.id] !== rank) {
                    btn.className = 'rank-btn disabled';
                    btn.disabled = true;
                }
            }
        });

        // 進行状況を更新
        const assignedCount = Object.keys(this.playerRankings).length;
        const progressElement = document.getElementById('ranking-progress');
        if (progressElement) {
            progressElement.textContent = `${assignedCount} / ${selectedPlayers.length} 人の順位が決まっています`;
            
            if (assignedCount === selectedPlayers.length) {
                progressElement.textContent += ' ✓ 完了';
                progressElement.style.color = '#48bb78';
            } else {
                progressElement.style.color = '#718096';
            }
        }
    }

    // 順位リセット
    resetRanking() {
        if (Object.keys(this.playerRankings).length === 0) {
            return;
        }

        if (!confirm('全ての順位設定をリセットしますか？')) {
            return;
        }

        this.playerRankings = {};
        this.updateRankingDisplay();
    }
}

// アプリケーション起動
let passwordAuth;
let ratingSystem;

document.addEventListener('DOMContentLoaded', () => {
    passwordAuth = new PasswordAuth();
});