// Rating and Comment Service
class RatingService {
    constructor() {
        this.authService = typeof authService !== 'undefined' ? authService : (typeof window !== 'undefined' ? window.authService : null);
    }

    // Get ratings for a movie
    getRatings(movieSlug) {
        const ratingsStr = localStorage.getItem('cinestream_ratings');
        const allRatings = ratingsStr ? JSON.parse(ratingsStr) : {};
        return allRatings[movieSlug] || [];
    }

    // Add or update rating
    addRating(movieSlug, rating, comment = '') {
        if (!this.authService.isLoggedIn()) {
            return { success: false, message: 'Vui lòng đăng nhập để đánh giá' };
        }

        const user = this.authService.getCurrentUser();
        const ratingsStr = localStorage.getItem('cinestream_ratings');
        const allRatings = ratingsStr ? JSON.parse(ratingsStr) : {};

        if (!allRatings[movieSlug]) {
            allRatings[movieSlug] = [];
        }

        // Check if user already rated
        const existingIndex = allRatings[movieSlug].findIndex(r => r.userId === user.id);

        const ratingData = {
            id: existingIndex >= 0 ? allRatings[movieSlug][existingIndex].id : Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            rating,
            comment,
            createdAt: existingIndex >= 0 ? allRatings[movieSlug][existingIndex].createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            likes: existingIndex >= 0 ? allRatings[movieSlug][existingIndex].likes : 0,
            dislikes: existingIndex >= 0 ? allRatings[movieSlug][existingIndex].dislikes : 0
        };

        if (existingIndex >= 0) {
            allRatings[movieSlug][existingIndex] = ratingData;
        } else {
            allRatings[movieSlug].push(ratingData);
        }

        localStorage.setItem('cinestream_ratings', JSON.stringify(allRatings));
        return { success: true, rating: ratingData };
    }

    // Get average rating
    getAverageRating(movieSlug) {
        const ratings = this.getRatings(movieSlug);
        if (ratings.length === 0) return 0;

        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        return (sum / ratings.length).toFixed(1);
    }

    // Get user's rating for a movie
    getUserRating(movieSlug) {
        if (!this.authService.isLoggedIn()) return null;

        const user = this.authService.getCurrentUser();
        const ratings = this.getRatings(movieSlug);
        return ratings.find(r => r.userId === user.id) || null;
    }

    // Get comments for a movie
    getComments(movieSlug) {
        const commentsStr = localStorage.getItem('cinestream_comments');
        const allComments = commentsStr ? JSON.parse(commentsStr) : {};
        return allComments[movieSlug] || [];
    }

    // Add comment
    addComment(movieSlug, comment) {
        if (!this.authService.isLoggedIn()) {
            return { success: false, message: 'Vui lòng đăng nhập để bình luận' };
        }

        const user = this.authService.getCurrentUser();
        const commentsStr = localStorage.getItem('cinestream_comments');
        const allComments = commentsStr ? JSON.parse(commentsStr) : {};

        if (!allComments[movieSlug]) {
            allComments[movieSlug] = [];
        }

        const commentData = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            comment,
            createdAt: new Date().toISOString(),
            likes: 0,
            dislikes: 0,
            replies: []
        };

        allComments[movieSlug].unshift(commentData);
        localStorage.setItem('cinestream_comments', JSON.stringify(allComments));

        return { success: true, comment: commentData };
    }

    // Like/Dislike comment
    likeComment(movieSlug, commentId, action = 'like') {
        if (!this.authService.isLoggedIn()) return { success: false };

        const commentsStr = localStorage.getItem('cinestream_comments');
        const allComments = commentsStr ? JSON.parse(commentsStr) : {};

        if (!allComments[movieSlug]) return { success: false };

        const comment = allComments[movieSlug].find(c => c.id === commentId);
        if (!comment) return { success: false };

        if (action === 'like') {
            comment.likes++;
        } else {
            comment.dislikes++;
        }

        localStorage.setItem('cinestream_comments', JSON.stringify(allComments));
        return { success: true, comment };
    }

    // Report comment
    reportComment(movieSlug, commentId, reason) {
        if (!this.authService.isLoggedIn()) {
            return { success: false, message: 'Vui lòng đăng nhập' };
        }

        const reportsStr = localStorage.getItem('cinestream_reports');
        const reports = reportsStr ? JSON.parse(reportsStr) : [];

        reports.push({
            id: Date.now().toString(),
            movieSlug,
            commentId,
            reason,
            reportedBy: this.authService.getCurrentUser().id,
            createdAt: new Date().toISOString()
        });

        localStorage.setItem('cinestream_reports', JSON.stringify(reports));
        return { success: true, message: 'Đã gửi báo cáo' };
    }

    // Reply to comment
    replyToComment(movieSlug, commentId, reply) {
        if (!this.authService.isLoggedIn()) {
            return { success: false, message: 'Vui lòng đăng nhập để trả lời' };
        }

        const user = this.authService.getCurrentUser();
        const commentsStr = localStorage.getItem('cinestream_comments');
        const allComments = commentsStr ? JSON.parse(commentsStr) : {};

        if (!allComments[movieSlug]) return { success: false };

        const comment = allComments[movieSlug].find(c => c.id === commentId);
        if (!comment) return { success: false };

        const replyData = {
            id: Date.now().toString(),
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            reply,
            createdAt: new Date().toISOString()
        };

        comment.replies.push(replyData);
        localStorage.setItem('cinestream_comments', JSON.stringify(allComments));

        return { success: true, reply: replyData };
    }
}

// Initialize Rating Service
const ratingService = new RatingService();
