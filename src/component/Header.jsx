import { Nav, Navbar, NavItem, NavLink, NavbarBrand, NavbarText, Button, Input, Form, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap'
import { initUser, userAtom, tokenAtom } from '../atoms';
import { useAtom, useSetAtom } from 'jotai/react';
import { useNavigate } from 'react-router-dom';

export default function Header({ alarms }) {
    const navigate = useNavigate();
    const [user, setUser] = useAtom(userAtom)
    const [token, setToken] = useAtom(tokenAtom);

    const logout = () => {
        setUser(initUser)
        setToken(null);
        navigate('/'); // 로그아웃 후 메인 페이지로 이동
    }

    return (
        <>
            <Navbar color='light' light expand="md" className='d-flex justify-content-between px-4'>
                <NavbarBrand href="/" className='fw-bold' style={{color: '#2563eb', fontSize: '1.8em'}}>
                    SOMACOM
                </NavbarBrand>

                <Form className='d-flex'>
                    <Input type="search" name="query" placeholder="DDR5 램, i5-13600K..." style={{width: '300px'}} />
                    <Button type="submit" color="primary" className='ms-2'>검색</Button>
                </Form>

                <Nav navbar className='gap-2'>
                    {user.username ? (
                        <>
                            <NavbarText className='fw-bold'>{user.username} 님</NavbarText>
                            <NavItem><NavLink href="/mypage">내 정보</NavLink></NavItem>
                            <NavItem><NavLink href="#" onClick={logout}>로그아웃</NavLink></NavItem>
                            <NavItem><NavLink href="/cart">장바구니</NavLink></NavItem>
                            {user.roles?.includes('ROLE_MANAGER') && (
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