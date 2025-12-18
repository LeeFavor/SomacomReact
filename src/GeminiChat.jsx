import React, { useState, useEffect, useRef } from 'react';
import { baseUrl } from './component/config'; // config 파일 경로가 맞는지 확인해주세요.
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'reactstrap';
import { useAtomValue } from 'jotai';
import { tokenAtom } from './atoms';
import { userAtom } from './atoms';
import { useAtom } from 'jotai';

const GeminiChat = () => {
  const [user, setUser] = useAtom(userAtom);
  const [isOpen, setIsOpen] = useState(false); // 채팅창 열림/닫힘 상태
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { text: '안녕하세요 무엇을 도와드릴까요?', sender: 'bot' }
  ]);
  const [loading, setLoading] = useState(false);
  const token = useAtomValue(tokenAtom);
  const navigate = useNavigate();
  const location = useLocation();



  // 스크롤 자동 이동을 위한 Ref
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  // 메시지가 추가될 때마다 스크롤을 맨 아래로 내림
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  // 메시지 내의 마크다운 링크 [Label](URL)를 파싱하여 렌더링하는 함수
  const renderMessageContent = (text, sender) => {
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // 링크 앞의 텍스트 추가
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // 링크 컴포넌트 추가
      const label = match[1];
      const url = match[2];
      parts.push(
        <span
          key={match.index}
          style={{
            color: sender === 'user' ? '#e0e0e0' : '#0d6efd',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontWeight: 'bold'
          }}
          onClick={() => navigate(url)}
        >
          {label}
        </span>
      );
      lastIndex = regex.lastIndex;
    }
    // 남은 텍스트 추가
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    // 2. 사용자 메시지 추가 및 입력창 즉시 초기화
    const userMessage = { text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput(''); // 입력창 비우기
    setLoading(true);

    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = token;
      }

      // Spring Boot 서버로 요청
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Network response was not ok');
      }

      const data = await response.json();

      // 3. 서버 응답(data.reply)을 화면에 표시하는 로직 추가
      // (Spring Boot DTO에서 'reply'라는 필드로 보낸다고 가정)
      const botMessage = { text: data.reply, sender: 'bot' };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error('Error:', error);
      // 에러 발생 시 사용자에게 알림
      const errorMessage = { text: `오류가 발생했습니다: ${error.message}`, sender: 'bot' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 관리자 및 판매자 페이지에서는 챗봇 숨김 처리
  const isRestrictedPage = location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/seller') ||
    ['/login-admin', '/login-seller', '/join-seller'].includes(location.pathname);

  if (isRestrictedPage) return null;

  return (


    <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999 }}>
      {/* 채팅창 */}
      {user && user.username && isOpen && (
        <div style={{
          width: '350px',
          height: '500px',
          backgroundColor: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderRadius: '15px',
          display: 'flex',
          flexDirection: 'column',
          marginBottom: '15px',
          overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ padding: '15px', background: '#2563eb', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>SOMACOM AI 챗봇</span>
            <button onClick={toggleChat} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2em' }}>&times;</button>
          </div>

          <div style={{ flex: 1, padding: '15px', overflowY: 'auto', backgroundColor: '#f9fafb' }}>
            {messages.map((msg, index) => (
              <div key={index} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '8px 0' }}>
                <span style={{
                  background: msg.sender === 'user' ? '#2563eb' : 'white',
                  color: msg.sender === 'user' ? 'white' : '#1f2937',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  maxWidth: '85%',
                  wordBreak: 'break-word',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  fontSize: '0.9rem',
                  border: msg.sender !== 'user' ? '1px solid #e5e7eb' : 'none'
                }}>
                  {renderMessageContent(msg.text, msg.sender)}
                </span>
              </div>
            ))}
            {loading && <div style={{ textAlign: 'left', color: '#6b7280', fontSize: '0.8em', marginLeft: '5px' }}>답변 생성 중...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '10px', borderTop: '1px solid #eee', display: 'flex', gap: '8px', backgroundColor: 'white' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="질문을 입력하세요..."
              disabled={loading}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #ddd', outline: 'none', fontSize: '0.9rem' }}
            />
            <Button color="primary" size="sm" onClick={sendMessage} disabled={loading} style={{ borderRadius: '20px', padding: '0 15px' }}>전송</Button>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      {user && user.username && !isOpen && (
        <button
          onClick={toggleChat}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: '28px',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          💬
        </button>
      )}
    </div>
  );
};


export default GeminiChat;