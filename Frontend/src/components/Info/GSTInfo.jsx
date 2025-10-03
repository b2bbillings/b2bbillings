import React, { useState } from 'react';
import { Card, Row, Col, Table, Badge, Tabs, Tab, Alert, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPercent, 
  faInfoCircle, 
  faCalculator, 
  faChartLine,
  faFileInvoice,
  faGlobe,
  faIndustry,
  faHome,
  faUtensils,
  faCar,
  faLaptop,
  faTshirt,
  faBook,
  faPills,
  faGavel
} from '@fortawesome/free-solid-svg-icons';
import './GSTInfo.css';

const GSTInfo = () => {
  const [activeTab, setActiveTab] = useState('rates');

  // GST Rate Slabs with comprehensive categories
  const gstRates = [
    {
      rate: '0%',
      color: 'success',
      icon: faHome,
      title: 'Essential Items',
      description: 'Basic necessities and essential goods',
      items: [
        'Fresh fruits and vegetables',
        'Milk and milk products (except condensed milk)',
        'Cereals like rice, wheat, etc.',
        'Salt, jaggery',
        'Fresh meat and fish',
        'Eggs',
        'Flour, besan',
        'Books, newspapers, handmade paper',
        'Khadi items',
        'Contraceptives',
        'Hotel accommodation below ₹1,000 per day'
      ]
    },
    {
      rate: '5%',
      color: 'info',
      icon: faUtensils,
      title: 'Processed Food & Daily Use',
      description: 'Processed food items and common household goods',
      items: [
        'Packaged food items below ₹1,000/kg',
        'Coffee, tea',
        'Edible oil',
        'Sugar, mishri',
        'Spices',
        'Cashew nuts',
        'Raisins',
        'Footwear below ₹1,000',
        'Handloom fabrics',
        'Small restaurants (non-AC, no liquor)',
        'Economy class air travel',
        'Railway travel'
      ]
    },
    {
      rate: '12%',
      color: 'warning',
      icon: faIndustry,
      title: 'Standard Items',
      description: 'Most manufactured goods and services',
      items: [
        'Processed food above ₹1,000/kg',
        'Fruits juices',
        'Namkeen, bhujia',
        'Tooth powder',
        'Ayurvedic medicines',
        'Exercise books',
        'Cellphones',
        'Frozen vegetables',
        'Butter, cheese, ghee',
        'Animal fat',
        'Sausage',
        'Business class air travel'
      ]
    },
    {
      rate: '18%',
      color: 'primary',
      icon: faLaptop,
      title: 'Standard Rate',
      description: 'Default rate for most goods and services',
      items: [
        'Capital goods',
        'Industrial intermediaries',
        'Computers, laptops',
        'Most electronic items',
        'Pasta, macaroni',
        'Cornflakes',
        'Pastries and cakes',
        'Preserved vegetables',
        'Jams, sauces',
        'Soups',
        'Ice cream',
        'Most services (restaurants, hotels, telecom)',
        'Financial services',
        'IT services'
      ]
    },
    {
      rate: '28%',
      color: 'danger',
      icon: faCar,
      title: 'Luxury & Sin Goods',
      description: 'Luxury items and demerit goods',
      items: [
        'Luxury cars',
        'Large cars (above 1500cc)',
        'SUVs',
        'Motorcycles above 350cc',
        'Aerated waters',
        'Luxury items',
        'Tobacco products',
        'Pan masala',
        'Molasses',
        'Chocolate (cocoa content <25%)',
        'Waffles with chocolate coating',
        'Paint',
        'Deodorants',
        'Shampoo',
        'Hair oil',
        'Sunscreen',
        'Dishwasher',
        'Washing machine above 10kg',
        'Camera',
        'Video game console'
      ]
    }
  ];

  // Additional GST Information
  const gstInfo = {
    composition: {
      title: 'GST Composition Scheme',
      rates: [
        { business: 'Traders', rate: '1%' },
        { business: 'Manufacturers', rate: '2%' },
        { business: 'Restaurants', rate: '5%' },
        { business: 'Service Providers', rate: '6%' }
      ],
      eligibility: '₹1.5 Crore annual turnover limit'
    },
    returns: [
      { form: 'GSTR-1', frequency: 'Monthly/Quarterly', description: 'Outward supplies' },
      { form: 'GSTR-3B', frequency: 'Monthly', description: 'Summary return' },
      { form: 'GSTR-2A', frequency: 'Monthly', description: 'Auto-populated purchase return' },
      { form: 'GSTR-4', frequency: 'Quarterly', description: 'Composition dealers' },
      { form: 'GSTR-9', frequency: 'Annual', description: 'Annual return' }
    ],
    penalties: [
      { violation: 'Late filing of GSTR-3B', penalty: '₹50 per day per return' },
      { violation: 'Late filing of GSTR-1', penalty: '₹25 per day per return' },
      { violation: 'Non-registration', penalty: '10% of tax due or ₹10,000' },
      { violation: 'Tax evasion', penalty: '100% of tax evaded' },
      { violation: 'Input tax credit misuse', penalty: '100% of credit wrongly availed' }
    ]
  };

  const stateInfo = [
    { component: 'CGST', description: 'Central GST - Goes to Central Government', rate: '50% of total GST' },
    { component: 'SGST', description: 'State GST - Goes to State Government', rate: '50% of total GST' },
    { component: 'IGST', description: 'Integrated GST - For inter-state transactions', rate: '100% of total GST' },
    { component: 'UGST', description: 'Union Territory GST - For UT transactions', rate: '50% of total GST' }
  ];

  return (
    <Container fluid className="gst-info-container p-4">
      <div className="d-flex align-items-center mb-4">
        <FontAwesomeIcon icon={faPercent} className="me-3 text-primary" size="2x" />
        <div>
          <h2 className="mb-1">GST Information Center</h2>
          <p className="text-muted mb-0">Comprehensive Guide to Goods & Services Tax</p>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="nav-tabs-custom mb-4"
        fill
      >
        <Tab eventKey="rates" title={<><FontAwesomeIcon icon={faPercent} className="me-2" />GST Rates</>}>
          <Row>
            {gstRates.map((rateInfo, index) => (
              <Col lg={6} xl={4} key={index} className="mb-4">
                <Card className="h-100 gst-rate-card">
                  <Card.Header className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                      <FontAwesomeIcon icon={rateInfo.icon} className="me-2" />
                      <span className="fw-bold">{rateInfo.title}</span>
                    </div>
                    <Badge bg={rateInfo.color} className="rate-badge">
                      {rateInfo.rate}
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small mb-3">{rateInfo.description}</p>
                    <div className="items-list">
                      {rateInfo.items.slice(0, 8).map((item, idx) => (
                        <div key={idx} className="item-tag mb-2">
                          <Badge bg="light" text="dark" className="me-1 mb-1">
                            {item}
                          </Badge>
                        </div>
                      ))}
                      {rateInfo.items.length > 8 && (
                        <small className="text-muted">
                          +{rateInfo.items.length - 8} more items...
                        </small>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="composition" title={<><FontAwesomeIcon icon={faCalculator} className="me-2" />Composition Scheme</>}>
          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <FontAwesomeIcon icon={faCalculator} className="me-2" />
                  GST Composition Scheme Rates
                </Card.Header>
                <Card.Body>
                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>Business Type</th>
                        <th>GST Rate</th>
                        <th>On Turnover</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstInfo.composition.rates.map((comp, idx) => (
                        <tr key={idx}>
                          <td>
                            <FontAwesomeIcon icon={faIndustry} className="me-2 text-muted" />
                            {comp.business}
                          </td>
                          <td>
                            <Badge bg="success">{comp.rate}</Badge>
                          </td>
                          <td className="text-muted">Annual Turnover</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="bg-light">
                <Card.Header>
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  Eligibility
                </Card.Header>
                <Card.Body>
                  <Alert variant="info" className="mb-3">
                    <strong>Turnover Limit:</strong><br />
                    {gstInfo.composition.eligibility}
                  </Alert>
                  <div className="benefits">
                    <h6>Benefits:</h6>
                    <ul className="list-unstyled">
                      <li>✓ Lower tax rates</li>
                      <li>✓ Simple compliance</li>
                      <li>✓ Quarterly returns only</li>
                      <li>✓ No input tax credit</li>
                    </ul>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="returns" title={<><FontAwesomeIcon icon={faFileInvoice} className="me-2" />Returns & Compliance</>}>
          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <FontAwesomeIcon icon={faFileInvoice} className="me-2" />
                  GST Return Forms
                </Card.Header>
                <Card.Body>
                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>Form</th>
                        <th>Frequency</th>
                        <th>Description</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstInfo.returns.map((returnForm, idx) => (
                        <tr key={idx}>
                          <td>
                            <Badge bg="primary">{returnForm.form}</Badge>
                          </td>
                          <td>{returnForm.frequency}</td>
                          <td>{returnForm.description}</td>
                          <td className="text-muted">
                            {returnForm.form === 'GSTR-3B' ? '20th of next month' :
                             returnForm.form === 'GSTR-1' ? '11th of next month' :
                             returnForm.form === 'GSTR-9' ? '31st December' : 'Varies'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="bg-warning-subtle">
                <Card.Header>
                  <FontAwesomeIcon icon={faGavel} className="me-2" />
                  Penalties
                </Card.Header>
                <Card.Body>
                  {gstInfo.penalties.map((penalty, idx) => (
                    <div key={idx} className="penalty-item mb-3">
                      <h6 className="small fw-bold">{penalty.violation}</h6>
                      <Badge bg="danger" className="w-100 text-wrap">
                        {penalty.penalty}
                      </Badge>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="structure" title={<><FontAwesomeIcon icon={faGlobe} className="me-2" />GST Structure</>}>
          <Row>
            <Col lg={8}>
              <Card>
                <Card.Header>
                  <FontAwesomeIcon icon={faGlobe} className="me-2" />
                  GST Components Breakdown
                </Card.Header>
                <Card.Body>
                  <Table responsive striped>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Full Form</th>
                        <th>Share</th>
                        <th>Applicable For</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stateInfo.map((state, idx) => (
                        <tr key={idx}>
                          <td>
                            <Badge bg={idx === 0 ? 'primary' : idx === 1 ? 'success' : idx === 2 ? 'warning' : 'info'}>
                              {state.component}
                            </Badge>
                          </td>
                          <td>{state.description}</td>
                          <td>
                            <strong>{state.rate}</strong>
                          </td>
                          <td className="text-muted">
                            {state.component === 'IGST' ? 'Inter-state transactions' :
                             state.component === 'UGST' ? 'Union Territory transactions' :
                             'Intra-state transactions'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4}>
              <Card className="bg-info-subtle">
                <Card.Header>
                  <FontAwesomeIcon icon={faChartLine} className="me-2" />
                  Key Points
                </Card.Header>
                <Card.Body>
                  <div className="key-points">
                    <div className="point-item mb-3">
                      <h6 className="small fw-bold">Registration Threshold</h6>
                      <p className="small mb-0">₹20 lakhs for goods, ₹10 lakhs for services</p>
                    </div>
                    <div className="point-item mb-3">
                      <h6 className="small fw-bold">Input Tax Credit</h6>
                      <p className="small mb-0">Available on business purchases</p>
                    </div>
                    <div className="point-item mb-3">
                      <h6 className="small fw-bold">E-way Bill</h6>
                      <p className="small mb-0">Required for goods movement above ₹50,000</p>
                    </div>
                    <div className="point-item">
                      <h6 className="small fw-bold">Reverse Charge</h6>
                      <p className="small mb-0">Buyer pays tax instead of seller</p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      <Alert variant="info" className="mt-4">
        <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
        <strong>Note:</strong> GST rates and rules are subject to change. Please consult official GST portal or tax advisor for the most current information.
        <br />
        <small>Last updated: October 2025 | Source: GST Council, Government of India</small>
      </Alert>
    </Container>
  );
};

export default GSTInfo;