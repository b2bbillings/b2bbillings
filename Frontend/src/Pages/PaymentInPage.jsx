import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import PaymentIn from '../components/New_Dashboard/Transactions/PaymentIn';

const PaymentInPage = ({ currentCompany, currentUser, addToast }) => {
  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <PaymentIn 
            currentCompany={currentCompany}
            currentUser={currentUser}
            addToast={addToast}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default PaymentInPage;