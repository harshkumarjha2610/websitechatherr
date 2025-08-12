import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Blog.css';

const Blog = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: '', content: '', mood: 'happy' });
  const [isWriting, setIsWriting] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Sample blog posts for demonstration
  const samplePosts = [
    {
      id: 1,
      title: "Late Night Thoughts",
      content: "Sometimes I wonder what it would be like to meet all the people I've chatted with online. We share our deepest thoughts but remain strangers.",
      mood: "thoughtful",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      likes: 12,
      comments: 3
    },
    {
      id: 2,
      title: "Found My Person",
      content: "Started chatting with someone random and we've been talking for hours. There's something magical about connecting with a stranger who gets you.",
      mood: "happy",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      likes: 28,
      comments: 7
    },
    {
      id: 3,
      title: "Digital Loneliness",
      content: "Surrounded by people online but feeling more alone than ever. Anyone else feel like we're all just floating in cyberspace?",
      mood: "sad",
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      likes: 45,
      comments: 12
    },
    {
      id: 4,
      title: "The Beauty of Anonymity",
      content: "There's something freeing about sharing your thoughts without anyone knowing who you are. We can be our truest selves.",
      mood: "grateful",
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      likes: 33,
      comments: 8
    }
  ];

  // Initialize posts
  useEffect(() => {
    setPosts(samplePosts);
  }, []);

  // Handle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleSubmitPost = (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    const post = {
      id: Date.now(),
      title: newPost.title,
      content: newPost.content,
      mood: newPost.mood,
      timestamp: new Date(),
      likes: 0,
      comments: 0
    };

    setPosts([post, ...posts]);
    setNewPost({ title: '', content: '', mood: 'happy' });
    setIsWriting(false);
  };

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const getMoodEmoji = (mood) => {
    const moods = {
      happy: '😊',
      sad: '😢',
      thoughtful: '🤔',
      grateful: '🙏',
      excited: '🎉',
      confused: '😕',
      angry: '😠',
      peaceful: '😌'
    };
    return moods[mood] || '😊';
  };

  return (
    <div className="blog-container">
      <header className="blog-header">
        <div className="blog-header-content">
          <Link to="/" className="back-button">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Chat
          </Link>
          
          <div className="blog-title-section">
            <span className="blog-icon">📝</span>
            <h1 className="blog-title">Anonymous Blogs</h1>
          </div>
          
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <main className="blog-main">
        <div className="blog-intro">
          <h2>Share Your Thoughts Anonymously</h2>
          <p>Express yourself freely without judgment. Your stories matter.</p>
        </div>

        <div className="blog-actions">
          <button 
            className="write-post-button"
            onClick={() => setIsWriting(!isWriting)}
          >
            {isWriting ? 'Cancel' : '✍️ Write a Post'}
          </button>
        </div>

        {isWriting && (
          <div className="new-post-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Give your post a title..."
                value={newPost.title}
                onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                className="post-title-input"
              />
            </div>
            
            <div className="form-group">
              <textarea
                placeholder="What's on your mind? Share your thoughts, feelings, or experiences..."
                value={newPost.content}
                onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                className="post-content-input"
                rows="6"
              />
            </div>
            
            <div className="form-group">
              <label>How are you feeling?</label>
              <select 
                value={newPost.mood}
                onChange={(e) => setNewPost({...newPost, mood: e.target.value})}
                className="mood-select"
              >
                <option value="happy">😊 Happy</option>
                <option value="sad">😢 Sad</option>
                <option value="thoughtful">🤔 Thoughtful</option>
                <option value="grateful">🙏 Grateful</option>
                <option value="excited">🎉 Excited</option>
                <option value="confused">😕 Confused</option>
                <option value="angry">😠 Angry</option>
                <option value="peaceful">😌 Peaceful</option>
              </select>
            </div>
            
            <button onClick={handleSubmitPost} className="submit-post-button">
              Share Anonymously
            </button>
          </div>
        )}

        <div className="blog-posts">
          {posts.map(post => (
            <article key={post.id} className="blog-post">
              <header className="post-header">
                <div className="post-meta">
                  <span className="post-mood">{getMoodEmoji(post.mood)}</span>
                  <span className="post-time">{formatTimeAgo(post.timestamp)}</span>
                </div>
              </header>
              
              <h3 className="post-title">{post.title}</h3>
              <p className="post-content">{post.content}</p>
              
              <footer className="post-footer">
                <button 
                  className="like-button"
                  onClick={() => handleLike(post.id)}
                >
                  ❤️ {post.likes}
                </button>
                <span className="comments-count">💬 {post.comments}</span>
              </footer>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Blog;