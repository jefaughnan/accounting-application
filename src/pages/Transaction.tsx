import React from 'react';
import styled from 'styled-components';
import axios from '../utils/axios';
import { mainColor } from '../constants/style';
import { UserState } from '../types/user';
import { CompanyState } from '../types/company';
import { AccountType } from '../types/account';
import { MultipleJournalType } from '../types/journal';
import { connect } from 'react-redux';
import { FormattedMessage, injectIntl, WrappedComponentProps } from 'react-intl';
import { Button, Message } from 'semantic-ui-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core';
import JournalEntry from '../components/JournalEntry';
import { faPlus, faMinus, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
library.add(faPlus, faMinus, faTimesCircle);
import { isEmpty, checkInvalidDealDate } from '../utils/validations';
import history, { createBrowserHistory } from 'history';

type OwnProps = {
  company: CompanyState;
  user: {
    id: string;
    name: string;
    company: CompanyState;
    isUserDataFetching: boolean;
    isUserDataFetched: boolean;
  };
  history: history.History;
  location: history.Location<any>;
};
type Props = OwnProps & WrappedComponentProps;

type ReduxState = UserState & CompanyState;

type IsRequiredErrors = {
  deal_date: boolean;
  debit_account_key: boolean;
  debit_amount: boolean;
  credit_account_key: boolean;
  credit_amount: boolean;
  [key: string]: any;
};

type IsInvalidErrors = {
  deal_date: boolean;
  [key: string]: any;
};

type State = {
  journalInput: {
    company_id: number;
    deal_date: string;
    debit_account_key: string;
    debit_sub_account_key: string;
    debit_amount: number;
    credit_account_key: string;
    credit_sub_account_key: string;
    credit_amount: number;
    remark: string;
    has_multiple_journal: boolean;
    [key: string]: any;
  };
  multipleJournalsInput: Array<MultipleJournalType>;
  multipleJournalIndex: number;
  accounts: Array<AccountType>;
  timesToAddJournal: number;
  creditTotalAmount: number;
  debitTotalAmount: number;
  errors: {
    isServerError: boolean;
    isRequiredErrors: IsRequiredErrors;
    isInvalidErrors: IsInvalidErrors;
    isMismatchTotal: boolean;
    isFilledRequiredFields: boolean;
    [key: string]: any;
  };
  hideSuccessMessage: boolean;
};

const multipleJournalFirstIndex = 2;

const requiredFields = [
  'deal_date',
  'debit_account_key',
  'debit_amount',
  'credit_account_key',
  'credit_amount',
];

class Transaction extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      journalInput: {
        company_id: this.props.company.id,
        deal_date: '',
        debit_account_key: '',
        debit_sub_account_key: '',
        debit_amount: 0,
        credit_account_key: '',
        credit_sub_account_key: '',
        credit_amount: 0,
        remark: '',
        has_multiple_journal: false,
      },
      multipleJournalsInput: [],
      multipleJournalIndex: multipleJournalFirstIndex,
      accounts: [],
      timesToAddJournal: 0,
      creditTotalAmount: 0,
      debitTotalAmount: 0,
      errors: {
        isServerError: false,
        isRequiredErrors: {
          deal_date: false,
          debit_account_key: false,
          debit_amount: false,
          credit_account_key: false,
          credit_amount: false,
        },
        isInvalidErrors: {
          deal_date: false,
        },
        isMismatchTotal: false,
        isFilledRequiredFields: false,
        errorMessageKeys: {
          deal_date: 'transaction.dealDate',
          debit_account_key: 'transaction.debitAccountName',
          debit_amount: 'transaction.debitAmount',
          credit_account_key: 'transaction.creditAccountName',
          credit_amount: 'transaction.creditAmount',
        },
      },
      hideSuccessMessage: false,
    };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.countUp = this.countUp.bind(this);
    this.countDown = this.countDown.bind(this);
    this.hideMessage = this.hideMessage.bind(this);
  }

  componentDidMount() {
    axios
      .get(`/api/accounts/${this.props.company.id}`)
      .then((response) => {
        this.setState({ accounts: response.data });
      })
      .catch(() => {
        const errors = { ...this.state.errors };
        errors['isServerError'] = true;
        return this.setState({ errors });
      });

    // Reset history.location.state
    const history: history.History<any> = createBrowserHistory();
    if (history.location.state && history.location.state.isDoneRegistration) {
      const state = { ...history.location.state };
      delete state.isDoneRegistration;
      history.replace({ ...history.location, state });
    }
  }

  static getDerivedStateFromProps(nextProps: Props, prevState: State) {
    let creditTotalAmount = prevState.journalInput.credit_amount;
    let debitTotalAmount = prevState.journalInput.debit_amount;
    const errors = { ...prevState.errors };
    errors['isMismatchTotal'] = false;

    // If the journal is one.
    if (prevState.timesToAddJournal === 0) {
      if (creditTotalAmount !== debitTotalAmount) {
        errors['isMismatchTotal'] = true;
      }
      return {
        creditTotalAmount: creditTotalAmount,
        debitTotalAmount: debitTotalAmount,
        errors: errors,
      };
    }

    const multipleJournalsInput = prevState.multipleJournalsInput;
    multipleJournalsInput.map((multipleJournal: MultipleJournalType) => {
      const creditAmount = isNaN(multipleJournal.credit_amount) ? 0 : multipleJournal.credit_amount;
      const debitAmount = isNaN(multipleJournal.debit_amount) ? 0 : multipleJournal.debit_amount;
      creditTotalAmount = creditTotalAmount + creditAmount;
      debitTotalAmount = debitTotalAmount + debitAmount;
    });
    if (creditTotalAmount !== debitTotalAmount) {
      errors['isMismatchTotal'] = true;
    }
    return {
      creditTotalAmount: creditTotalAmount,
      debitTotalAmount: debitTotalAmount,
      errors: errors,
    };
  }

  handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const journal = this.state.journalInput;
    const multipleJournals = this.state.multipleJournalsInput;
    const errors = { ...this.state.errors };
    requiredFields.map((requiredField) => {
      if (isEmpty(journal[requiredField])) {
        errors['isRequiredErrors'][requiredField] = true;
      }
    });
    this.setState({ errors });
    if (
      Object.values(errors.isRequiredErrors).includes(true) ||
      Object.values(errors.isInvalidErrors).includes(true) ||
      Object.values(errors.isMismatchTotal).includes(true)
    ) {
      return;
    }

    axios
      .post('/api/journals/new', {
        journal: journal,
        multiple_journals: multipleJournals,
      })
      .then(() => {
        this.props.history.push({
          pathname: '/transaction',
          state: { isDoneRegistration: true },
        });
      })
      .catch(() => {
        const errors = { ...this.state.errors };
        errors['isServerError'] = true;
        return this.setState({ errors });
      });
  }

  handleChange(
    e: React.ChangeEvent<HTMLInputElement>,
    isRequired: boolean,
    multipleJournalIndex?: number | null
  ) {
    const journalInput = { ...this.state.journalInput };
    const { fiscal_start_date, fiscal_end_date } = this.props.company;
    const errors = { ...this.state.errors };
    let inputValue: string | number = e.target.value;
    const name: string = e.target.name;
    if (isEmpty(inputValue) && isRequired) {
      errors['isRequiredErrors'][name] = true;
      errors['isFilledRequiredFields'] = false;
      return this.setState({ errors });
    }
    errors['isRequiredErrors'][name] = false;

    const isRequiredErrors = errors['isRequiredErrors'];
    errors['isFilledRequiredFields'] = this.checkRequiredError(isRequiredErrors, 'isRequired');

    if (name === 'debit_amount' || name === 'credit_amount') {
      inputValue = parseInt(e.target.value);
    }

    if (name === 'deal_date') {
      const isInvalidError = checkInvalidDealDate(
        inputValue.toString(),
        fiscal_start_date,
        fiscal_end_date
      );
      errors['isInvalidErrors']['deal_date'] = isInvalidError;
    }

    if (multipleJournalIndex) {
      journalInput['has_multiple_journal'] = true;
      // multipleJournalIndex starts from 2. But multipleJournalsInput's array index starts from 0.
      const IndexNumber = multipleJournalIndex - 2;
      const multipleJournalsInput = this.state.multipleJournalsInput;
      multipleJournalsInput[IndexNumber][name] = inputValue;
      this.setState({ journalInput });
      return this.setState({ multipleJournalsInput });
    }

    if (this.state.timesToAddJournal === 0) {
      journalInput['has_multiple_journal'] = false;
    }

    this.setState({ errors });
    journalInput[name] = inputValue;
    this.setState({ journalInput });
  }

  checkRequiredError(errors: IsRequiredErrors, arrayKey: string): boolean {
    const allErrors = [];
    Object.keys(errors).forEach((key: string) => {
      if (errors[key][arrayKey] === true) {
        allErrors.push(key);
      }
    });
    if (allErrors.length === 0) {
      return true;
    }
    return false;
  }

  hideMessage() {
    this.setState({ hideSuccessMessage: true });
  }

  countUp() {
    this.setState({ timesToAddJournal: this.state.timesToAddJournal + 1 });
    const multipleJournalsInput = this.state.multipleJournalsInput;
    multipleJournalsInput.push({
      company_id: this.props.company.id,
      multiple_journal_index: this.state.multipleJournalIndex,
      debit_account_key: '',
      debit_sub_account_key: '',
      debit_amount: 0,
      credit_account_key: '',
      credit_sub_account_key: '',
      credit_amount: 0,
      remark: '',
    });
    this.setState({ multipleJournalIndex: this.state.multipleJournalIndex + 1 });
    this.setState({ multipleJournalsInput });
  }

  countDown() {
    this.setState({ timesToAddJournal: this.state.timesToAddJournal - 1 });
    this.setState({ multipleJournalIndex: this.state.multipleJournalIndex - 1 });
    const multipleJournalsInput = this.state.multipleJournalsInput;
    multipleJournalsInput.pop();
    this.setState({ multipleJournalsInput });
  }

  renderErrorMessages() {
    const errorMessages: Array<any> = [];
    const { isRequiredErrors, isInvalidErrors, errorMessageKeys } = this.state.errors;
    {
      Object.keys(isRequiredErrors).forEach((key: string, index: number) => {
        if (isRequiredErrors[key] === true) {
          errorMessages.push(
            <span key={index} style={{ color: 'red' }}>
              {this.props.intl.formatMessage({
                id: errorMessageKeys[key],
                defaultMessage: 'error',
              })}
              {this.props.intl.formatMessage({
                id: 'transaction.requiredError',
                defaultMessage: 'は入力必須項目です。',
              })}
            </span>
          );
        }
      });

      Object.keys(isInvalidErrors).forEach((key: string, index: number) => {
        if (isInvalidErrors[key] === true) {
          const messageId =
            key === 'deal_date' ? 'transaction.invalidDealDate' : 'transaction.invalidError';
          errorMessages.push(
            <span key={index} style={{ color: 'red' }}>
              {this.props.intl.formatMessage({
                id: errorMessageKeys[key],
                defaultMessage: 'error',
              })}
              {this.props.intl.formatMessage({
                id: messageId,
                defaultMessage: 'は無効な値です。',
              })}
            </span>
          );
        }
      });

      if (this.state.errors.isServerError) {
        errorMessages.push(
          <span style={{ color: 'red' }}>
            {this.props.intl.formatMessage({
              id: 'error.serverError',
              defaultMessage:
                '何らかのエラーが発生しています。申し訳ありませんが時間を空けて再度お試し下さい。',
            })}
          </span>
        );
      }

      if (this.state.errors.isMismatchTotal) {
        errorMessages.push(
          <span style={{ color: 'red' }}>
            {this.props.intl.formatMessage({
              id: 'transaction.mismatchTotal',
              defaultMessage: '貸借の金額が一致しません。',
            })}
          </span>
        );
      }

      if (errorMessages.length === 0) {
        return null;
      }

      return <ErrorMessages>{errorMessages}</ErrorMessages>;
    }
  }

  renderJournalEntries() {
    const journalEntries = [];
    const isFilledRequiredFields: boolean = this.state.errors.isRequiredErrors
      .isFilledRequiredFields;
    for (let index = 0; index < this.state.timesToAddJournal; index++) {
      journalEntries.push(
        <JournalEntry
          key={index}
          accounts={this.state.accounts}
          isMultipleJournal={true}
          isFilledRequiredFields={isFilledRequiredFields}
          isMismatchTotal={this.state.errors.isMismatchTotal}
          handleChange={this.handleChange.bind(this)}
          // The number of multiple journals start from 2.
          multipleJournalIndex={index + multipleJournalFirstIndex}
        ></JournalEntry>
      );
    }
    return journalEntries;
  }

  render(): React.ReactNode {
    const { accounts } = this.state;
    const isFilledRequiredFields = this.state.errors.isFilledRequiredFields;
    const isDoneRegistration = this.props.location.state
      ? this.props.location.state.isDoneRegistration
      : false;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          minHeight: '670px',
        }}
      >
        {isDoneRegistration && !this.state.hideSuccessMessage && (
          <Message
            style={{
              marginTop: '20px',
              color: '#1a531b',
              fontSize: '1.14285714em',
              fontWeight: 600,
            }}
            success
          >
            {this.props.intl.formatMessage({
              id: 'transaction.journalEntry',
              defaultMessage: '振替伝票を作成しました。',
            })}
            <FontAwesomeIcon
              icon="times-circle"
              style={{
                marginLeft: '8px',
              }}
              onClick={() => this.hideMessage()}
            />
          </Message>
        )}
        <div
          style={{
            background: 'white',
            width: '95%',
            height: '10%',
            marginTop: isDoneRegistration && !this.state.hideSuccessMessage ? '0px' : '40px',
          }}
        >
          <h1 style={{ fontWeight: 'bold', fontSize: '18px', margin: '20px' }}>
            <FormattedMessage id="transaction.transferSlip" defaultMessage="振替伝票" />
          </h1>
          <form onSubmit={this.handleSubmit}>
            <table
              style={{
                marginTop: '20px',
                marginRight: '20px',
                marginLeft: '20px',
                marginBottom: '20px',
                borderBottom: 'solid 1px #ddd',
                borderRight: 'solid 1px #ddd',
              }}
            >
              <thead style={{ background: '#DDDDDD' }}>
                <tr>
                  <TableData>
                    <FormattedMessage id="transaction.dealDate" defaultMessage="取引日" />
                  </TableData>
                  <TableData>
                    <FormattedMessage id="transaction.debitAccountName" defaultMessage="借方科目" />
                  </TableData>
                  <TableData>
                    <FormattedMessage id="transaction.subAccount" defaultMessage="補助科目" />
                  </TableData>
                  <TableData>
                    <FormattedMessage id="transaction.debitAmount" defaultMessage="借方金額" />
                  </TableData>
                  <TableData>
                    <FormattedMessage
                      id="transaction.creditAccountName"
                      defaultMessage="貸方科目"
                    />
                  </TableData>
                  <TableData>
                    <FormattedMessage id="transaction.subAccount" defaultMessage="補助科目" />
                  </TableData>
                  <TableData>
                    <FormattedMessage id="transaction.creditAmount" defaultMessage="貸方金額" />
                  </TableData>
                  <TableData>
                    <FormattedMessage id="transaction.remark" defaultMessage="摘要" />
                  </TableData>
                  <TableData>
                    <FormattedMessage id="common.register" defaultMessage="登録" />
                  </TableData>
                </tr>
              </thead>
              <tbody>
                {/* The first line of journal. */}
                <JournalEntry
                  isMultipleJournal={false}
                  accounts={accounts}
                  isFilledRequiredFields={isFilledRequiredFields}
                  isMismatchTotal={this.state.errors.isMismatchTotal}
                  handleChange={this.handleChange.bind(this)}
                  journalInput={this.state.journalInput}
                />
                {this.state.timesToAddJournal > 0 && this.renderJournalEntries()}
              </tbody>
            </table>
          </form>
          {this.renderErrorMessages()}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-start',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                background: '#FFEFD5',
                width: '30%',
                marginLeft: '140px',
                borderRadius: '5px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ marginLeft: '20px' }}>
                <FormattedMessage id="transaction.debitTotalAmount" defaultMessage="借方合計" />
              </span>
              <span style={{ marginRight: '20px' }}>
                {this.state.debitTotalAmount.toLocaleString()}&nbsp;&nbsp;
                <FormattedMessage id="common.yen" defaultMessage="円" />
              </span>
            </div>
            <div
              style={{
                background: '#FFEFD5',
                width: '30%',
                marginLeft: '160px',
                marginBottom: '10px',
                borderRadius: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ marginLeft: '20px' }}>
                <FormattedMessage id="transaction.creditTotalAmount" defaultMessage="貸方合計" />
              </span>
              <span style={{ marginRight: '20px' }}>
                {this.state.creditTotalAmount.toLocaleString()}&nbsp;&nbsp;
                <FormattedMessage id="common.yen" defaultMessage="円" />
              </span>
            </div>
            <div style={{ width: '20%', display: 'flex', justifyContent: 'flex-end' }}>
              {this.state.timesToAddJournal > 0 && (
                <Button
                  onClick={() => this.countDown()}
                  style={{
                    color: 'black',
                    padding: '8px',
                    fontSize: '12px',
                    marginBottom: '20px',
                    marginRight: '18px',
                  }}
                >
                  <FontAwesomeIcon
                    icon="minus"
                    style={{
                      marginRight: '8px',
                      color: 'black',
                    }}
                  />
                  <FormattedMessage id="transaction.reduceRow" defaultMessage="行削除" />
                </Button>
              )}
              <Button
                onClick={() => this.countUp()}
                style={{
                  background: mainColor,
                  color: 'white',
                  padding: '8px',
                  fontSize: '12px',
                  marginBottom: '20px',
                  marginRight: '30px',
                }}
              >
                <FontAwesomeIcon
                  icon="plus"
                  style={{
                    marginRight: '8px',
                    color: 'white',
                  }}
                />
                <FormattedMessage id="transaction.addRow" defaultMessage="行追加" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const TableData = styled.td`
  height: 40px;
  width: 150px;
  padding: 10px;
  text-align: center;
  border-top: 1px solid #ddd;
  border-left: 1px solid #ddd;
`;
const ErrorMessages = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  margin-right: 50px;
  flex-direction: column;
  margin-bottom: 30px;
`;

function mapStateToProps(state: ReduxState) {
  return {
    user: state.data.user,
    company: state.data.user.company,
  };
}

export default connect(mapStateToProps)(injectIntl(Transaction));
