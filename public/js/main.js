'use strict';

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

// Like / Dislike buttons
document.querySelectorAll('.like-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const videoId = btn.dataset.id;
    const type = btn.dataset.type;

    try {
      const res = await fetch(`/videos/${videoId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ type })
      });

      if (res.status === 401) {
        window.location.href = '/auth/login';
        return;
      }

      if (!res.ok) return;

      const data = await res.json();

      // Update like count
      const likeBtn = document.querySelector('.like-btn[data-type="like"]');
      const dislikeBtn = document.querySelector('.like-btn[data-type="dislike"]');

      if (likeBtn) {
        likeBtn.querySelector('.like-count').textContent = data.likesCount;
        likeBtn.classList.toggle('active', data.userAction === 'like');
      }
      if (dislikeBtn) {
        dislikeBtn.querySelector('.dislike-count').textContent = data.dislikesCount;
        dislikeBtn.classList.toggle('active', data.userAction === 'dislike');
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  });
});
