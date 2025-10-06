import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import PaymentOut from '../components/New_Dashboard/Transactions/PaymentOut';

const PaymentOutPage = ({ currentCompany, currentUser, addToast }) => {
  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <PaymentOut 
            currentCompany={currentCompany}
            currentUser={currentUser}
            addToast={addToast}
          />
        </Col>
      </Row>
    </Container>
  );
};

export default PaymentOutPage;