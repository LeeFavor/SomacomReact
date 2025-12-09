import { Nav, Navbar, NavItem, NavLink, NavbarBrand, NavbarText, Button, Input, Form, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem, InputGroup, ListGroup, ListGroupItem } from 'reactstrap'
import { initUser, userAtom, tokenAtom } from '../atoms';
import { useAtom, useSetAtom } from 'jotai/react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { myAxios } from './config';

export default function Header({ alarms }) {
    const navigate = useNavigate();
    const [user, setUser] = useAtom(userAtom)
    const [token, setToken] = useAtom(tokenAtom);
    const [keyword, setKeyword] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchContainerRef = useRef(null);

    const logout = () => {
        setUser(initUser)
        setToken(null);
        navigate('/'); // 로그아웃 후 메인 페이지로 이동
    }

    // Debounce를 위한 useEffect
    useEffect(() => {
        if (keyword.length < 2) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const debounce = setTimeout(() => {
            myAxios(token, setToken).get('/products/autocomplete', { params: { keyword } })
                .then(res => {
                    console.log(res.data)
                    setSuggestions(res.data);
                    setShowSuggestions(true);
                })
                .catch(err => {
                    console.error("자동완성 조회 실패:", err);
                    setSuggestions([]);
                });
        }, 300); // 300ms 지연

        return () => clearTimeout(debounce);
    }, [keyword, token, setToken]);

    // 외부 클릭 시 자동완성 창 닫기
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchContainerRef]);


    const handleSuggestionClick = (suggestionName) => {
        setKeyword(suggestionName);
        setShowSuggestions(false);
    };

    // const clearKeyword = () => {
    //     setKeyword('');
    //     setSuggestions([]);
    //     setShowSuggestions(false);
    // }

    const handleSearch = (e) => {
        e.preventDefault();
        // 제안 목록에 있는 키워드와 현재 입력값이 정확히 일치할 때만 검색 실행
        const isValidKeyword = suggestions.some(s => s.name === keyword) || keyword.length > 0 && suggestions.length > 0 && suggestions[0].name === keyword;
        if (keyword && isValidKeyword) {
            navigate({ pathname: '/search', search: `?${createSearchParams({ keyword })}` });
        } else if (keyword) {
            alert("자동완성 목록에서 키워드를 선택해주세요.");
        }
    };

    return (
        <>
            <Navbar color='light' light expand="md" className='d-flex justify-content-between px-4'>
                <NavbarBrand href="/" className='fw-bold' style={{color: '#2563eb', fontSize: '1.8em'}}>
                    SOMACOM
                </NavbarBrand>

                <div ref={searchContainerRef} style={{ position: 'relative', width: '350px' }}>
                    <Form className='d-flex' onSubmit={handleSearch}>
                        <InputGroup>
                            <Input type="search" name="query" placeholder="모델명 검색..." value={keyword} onChange={(e) => setKeyword(e.target.value)} autoComplete="off" />
                            {/* {keyword && <Button onClick={clearKeyword} color="light" style={{ zIndex: 5 }}>X</Button>} */}
                            <Button type="submit" color="primary">검색</Button>
                        </InputGroup>
                    </Form>
                    {showSuggestions && suggestions.length > 0 && (
                        <ListGroup style={{ position: 'absolute', top: '100%', width: '100%', zIndex: 1000, border: '1px solid #ddd' }}>
                            {suggestions.map((s, index) => (
                                <ListGroupItem key={index} action tag="button" onClick={() => handleSuggestionClick(s.name)}
                                    style={{ cursor: 'pointer', textAlign: 'left' }}>
                                    {s.name}
                                </ListGroupItem>
                            ))}
                        </ListGroup>
                    )}
                </div>

                <Nav navbar className='gap-2'>
                    {user.username ? (
                        <>
                            <NavbarText className='fw-bold'>{user.username} 님</NavbarText>
                            <NavItem><NavLink href="/mypage">내 정보</NavLink></NavItem>
                            <NavItem><NavLink href="#" onClick={logout}>로그아웃</NavLink></NavItem>
                            <NavItem><NavLink href="/cart">장바구니</NavLink></NavItem>
                            {user.roles?.includes('ROLE_SELLER') && (
                                <NavItem><NavLink href="/seller-center">판매자 센터</NavLink></NavItem>
                            )}
                            {user.roles?.includes('ROLE_ADMIN') && (
                                <NavItem><NavLink href="/admin">관리자 페이지</NavLink></NavItem>
                            )}
                        </>
                    ) : (
                        <>
                            <UncontrolledDropdown nav inNavbar>
                                <DropdownToggle nav caret>로그인</DropdownToggle>
                                <DropdownMenu end>
                                    <DropdownItem href="/login">일반 사용자</DropdownItem>
                                    <DropdownItem href="/login-seller">판매자</DropdownItem>
                                    <DropdownItem href="/login-admin">관리자</DropdownItem>
                                </DropdownMenu>
                            </UncontrolledDropdown>
                            <UncontrolledDropdown nav inNavbar>
                                <DropdownToggle nav caret>회원가입</DropdownToggle>
                                <DropdownMenu end>
                                    <DropdownItem href="/join">일반 회원가입</DropdownItem>
                                    <DropdownItem href="/join-seller">판매자 입점신청</DropdownItem>
                                </DropdownMenu>
                            </UncontrolledDropdown>
                            <NavItem><NavLink href="/cart">장바구니</NavLink></NavItem>
                        </>
                    )}
                </Nav>

            </Navbar>
        </>
    )
}