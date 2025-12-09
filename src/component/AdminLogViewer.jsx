import { useState, useEffect, useRef } from 'react';
import { Container, Button, Spinner, Alert, Card, CardBody } from 'reactstrap';
import { Link } from 'react-router-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function AdminLogViewer() {
    const [logs, setLogs] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // 에러 메시지
    const logContainerRef = useRef(null); // 로그 컨테이너 참조
    const [autoScroll, setAutoScroll] = useState(true); // 자동 스크롤 여부

    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    const fetchLogs = (isInitialLoad = false) => {
        // 초기 로딩 시에만 스피너를 표시
        if (isInitialLoad) {
            setLoading(true);
        }
        // 백엔드에 로그 조회 API 구현 필요 (예: GET /api/admin/logs)
        myAxios(token, setToken).get('/admin/logs', { disableLogging: true }) // 이 요청에 대한 콘솔 로깅 비활성화
            .then(res => {
                setLogs(res.data);
            })
            .catch(err => {
                console.error("로그 조회 실패:", err);
                setError("로그를 불러오는 데 실패했습니다. 백엔드 API(/api/admin/logs) 구현이 필요할 수 있습니다.");
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        // 초기 로그 로드
        fetchLogs(true);

        // 1초마다 로그 자동 갱신
        const intervalId = setInterval(() => fetchLogs(false), 1000); // 매 초마다 갱신

        // 컴포넌트 언마운트 시 인터벌 정리
        return () => clearInterval(intervalId);
    }, [token, setToken]); // token, setToken이 변경될 때만 다시 설정

    // 로그 내용이 업데이트될 때마다 스크롤 처리
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]); // logs 또는 autoScroll 상태가 변경될 때 실행

    // 사용자 스크롤 감지
    const handleScroll = () => {
        if (logContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
            // 사용자가 최하단에 있으면 자동 스크롤 활성화
            // 약간의 오차 범위 허용 (예: 1px)
            if (scrollHeight - scrollTop <= clientHeight + 1) {
                setAutoScroll(true);
            } else {
                // 사용자가 수동으로 스크롤을 올리면 자동 스크롤 비활성화
                setAutoScroll(false);
            }
        }
    };

    return (
        <Container className='mt-4'>
            <Button tag={Link} to="/admin/scheduler" color="secondary" outline className='mb-4'>&laquo; 스케줄러 관리로 돌아가기</Button>
            <h2 className='page-title'>시스템 로그 뷰어</h2>
            <Button color="primary" onClick={fetchLogs} className="mb-3">새로고침</Button>
            <Card className="mb-3">
                <CardBody
                    ref={logContainerRef}
                    onScroll={handleScroll}
                    style={{
                        backgroundColor: '#282c34',
                        color: '#abb2bf',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        height: '600px', // 고정 높이
                        overflowY: 'auto', // 세로 스크롤
                        overflowX: 'auto',
                        border: '1px solid #444',
                        borderRadius: '5px'
                    }}
                >
                    {loading ? <Spinner color="light" /> : error ? <Alert color="danger">{error}</Alert> : logs || '표시할 로그가 없습니다.'}
                </CardBody>
            </Card>
            <div className="text-end">
                <small className="text-muted">자동 스크롤: {autoScroll ? '활성화' : '비활성화'}</small>
            </div>
        </Container>
    );
}