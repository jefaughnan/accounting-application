import React from 'react';
import axios from '../utils/axios';
import styled from 'styled-components';
import { Button, Input } from 'semantic-ui-react';
import { connect } from 'react-redux';
import { languageState } from '../types/language';
import { mainColor, backGroundColor } from '../constants/style';
import { FormattedMessage, injectIntl } from 'react-intl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import LanguageDropdown from '../components/LanguageDropdown';

type Props = any;
type State = {
  response: any;
  loginInput: {
    password: string;
    email: string;
    [key: string]: any;
  };
  loginError: string;
};

class Login extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      response: '',
      loginInput: {
        password: '',
        email: '',
      },
      loginError: '',
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const loginInput = { ...this.state.loginInput };
    loginInput[e.target.name] = e.target.value;
    this.setState({ loginInput });
  }

  handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    axios
      .post('/api/login', {
        email: this.state.loginInput.email,
        password: this.state.loginInput.password,
      })
      .then((response: any) => {
        localStorage.setItem('token', response.data.token);
        location.pathname = '/home';
      })
      .catch((error: any) => {
        console.error(error);

        this.setState({
          loginError: this.props.intl.formatMessage({
            id: 'login.loginError',
            defaultMessage: 'パスワードかメールアドレスが間違っています。',
          }),
        });
      });
  }

  render(): React.ReactNode {
    return (
      <LoginWrapper>
        <LanguageSection>
          <LanguageDropdown height={'5%'} />
        </LanguageSection>
        <LoginContainer>
          <LoginSection>
            <ServiceName>
              <FontAwesomeIcon
                icon="chart-pie"
                style={{
                  width: 40,
                  height: 40,
                  color: mainColor,
                }}
              />
              <span style={{ color: mainColor }}>&nbsp;Accounting</span>
            </ServiceName>
            <LoginTitle>
              <FormattedMessage id="login.loginMessage" defaultMessage="ログイン" />
            </LoginTitle>
            <br />
            <form onSubmit={this.handleSubmit}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column',
                }}
              >
                <Input
                  name="email"
                  type="email"
                  placeholder="E-mail address"
                  onChange={(e) => this.handleChange(e)}
                />
                <Input
                  name="password"
                  type="password"
                  placeholder="Password"
                  onChange={(e) => this.handleChange(e)}
                  style={{ marginTop: '15px' }}
                />
                {this.state.loginError && (
                  <span style={{ color: 'red', marginTop: '10px' }}>{this.state.loginError}</span>
                )}
                <Button type="submit" style={{ color: 'black', marginTop: '25px' }} size="large">
                  <FormattedMessage id="login.submitButton" defaultMessage="送信" />
                </Button>
              </div>
            </form>
          </LoginSection>
        </LoginContainer>
      </LoginWrapper>
    );
  }
}

const ServiceName = styled.h1`
  font-size: 50px;
  text-align: left;
  margin-right: 20px;
  margin-bottom: 45px;
  font-family: Pacifico;
  color: ${mainColor};
`;

const LoginTitle = styled.span`
  font-size: 20px;
  text-align: center;
  margin-bottom: 5px;
  color: ${mainColor};
  font-weight: bold;
`;

const LanguageSection = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const LoginWrapper = styled.div`
  width: 100%;
  height: 100%;
  background: ${backGroundColor};
`;

const LoginContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 90%;
`;

const LoginSection = styled.div`
  width: 30%;
  height: 75%;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  background: white;
`;

function mapStateToProps(state: languageState) {
  return {
    language: state.ui.language.locale,
  };
}

export default connect(mapStateToProps)(injectIntl(Login));
