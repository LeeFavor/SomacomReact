import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Container, Spinner, Alert } from 'reactstrap';
import { useAtomValue, useSetAtom } from 'jotai';
import { tokenAtom } from '../atoms';
import { myAxios } from './config';

export default function PaymentSuccess() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = useAtomValue(tokenAtom);
    const setToken = useSetAtom(tokenAtom);

    const [message, setMessage] = useState('결제를 승인하고 있습니다. 잠시만 기다려주세요...');
    const [error, setError] = useState('');

    useEffect(() => {
        const paymentKey = searchParams.get('paymentKey');
        const tossOrderId = searchParams.get('orderId'); // 토스에서 받은 orderId (paymentOrderId)
        const amount = searchParams.get('amount');

        if (!paymentKey || !tossOrderId || !amount) {
            setError('결제 정보가 올바르지 않습니다.');
            return;
        }

        // 6. 백엔드에 결제 승인 요청 (guide.txt의 3번 API)
        // 백엔드는 이 요청을 받아 토스 페이먼츠에 최종 확인 후 DB 상태를 업데이트합니다.
        myAxios(token, setToken).post('/payments/toss/confirm', {
            paymentKey,
            orderId: tossOrderId, // 백엔드에 paymentOrderId를 전달
            amount: Number(amount), // 문자열을 숫자로 변환하여 전달
        })
        .then(res => {
            // 최종 승인 성공 시, 백엔드가 반환한 우리 시스템의 실제 orderId
            const finalOrderId = res.data.orderId; 
            setMessage('결제가 성공적으로 완료되었습니다. 주문 완료 페이지로 이동합니다.');
            setTimeout(() => {
                navigate(`/order-complete/${finalOrderId}`);
            }, 2000);
        })
        .catch(err => {
            console.error("결제 승인 실패:", err);
            setError(err.response?.data?.message || '결제 승인에 실패했습니다. 문제가 지속되면 고객센터로 문의해주세요.');
            // TODO: 결제 실패 시, 토스 페이먼츠의 결제 취소 API를 호출하는 로직을 백엔드에 추가하면 더 좋습니다.
            // 실패 시 사용자를 장바구니나 메인으로 보낼 수 있습니다.
            setTimeout(() => navigate('/cart'), 3000);
        });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Container className="text-center p-5">
            {error ? <Alert color="danger">{error}</Alert> : <Alert color="info">{message}</Alert>}
            {!error && <Spinner />}
        </Container>
    );
}