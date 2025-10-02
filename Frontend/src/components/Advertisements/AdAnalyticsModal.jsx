import React, { useEffect, useState, useRef } from 'react';
import { Modal, Button, Spinner, Row, Col, Card } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import advertisementService from '../../services/advertisementService';
import './AdAnalyticsModal.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AdAnalyticsModal = ({ show, onHide, adId }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('7d');
  const chartRef = useRef(null);

  useEffect(() => {
    if (!show || !adId) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await advertisementService.getAdAnalytics(adId, period);
        setData(res.data || res);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [show, adId]);

  const chartData = () => {
    if (!data) return { labels: [], datasets: [] };

    const labels = data.labels || data.dates || Object.keys(data.series || {});
    const impressions = data.impressions || data.series?.impressions || [];
    const clicks = data.clicks || data.series?.clicks || [];

    return {
      labels,
      datasets: [
        {
          label: 'Impressions',
          data: impressions,
          borderColor: 'rgba(75,192,192,1)',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(75,192,192,0.35)');
            gradient.addColorStop(1, 'rgba(75,192,192,0.05)');
            return gradient;
          }
        },
        {
          label: 'Clicks',
          data: clicks,
          borderColor: 'rgba(153,102,255,1)',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(153,102,255,0.35)');
            gradient.addColorStop(1, 'rgba(153,102,255,0.05)');
            return gradient;
          }
        }
      ]
    };
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Advertisement Analytics</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="analytics-top d-flex justify-content-between align-items-center mb-3">
          <div className="analytics-title">
            <h5 className="mb-0">Performance Overview</h5>
            <small className="text-muted">Last {period}</small>
          </div>
          <div className="period-buttons">
            {['7d','14d','30d'].map(p => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? 'primary' : 'outline-primary'}
                className="me-2"
                onClick={() => setPeriod(p)}
              >{p}</Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <div>
            {data ? (
              <>
                <Row>
                  <Col md={8}>
                    <div className="chart-wrapper">
                      <Line ref={chartRef} data={chartData()} />
                    </div>
                  </Col>
                  <Col md={4} className="mt-3 mt-md-0">
                    <Card className="summary-card mb-2">
                      <Card.Body>
                        <div className="stat">
                          <div className="stat-value">{data.totalImpressions ?? data.impressionsTotal ?? 0}</div>
                          <div className="stat-label">Impressions</div>
                        </div>
                      </Card.Body>
                    </Card>
                    <Card className="summary-card mb-2">
                      <Card.Body>
                        <div className="stat">
                          <div className="stat-value">{data.totalClicks ?? data.clicksTotal ?? 0}</div>
                          <div className="stat-label">Clicks</div>
                        </div>
                      </Card.Body>
                    </Card>
                    <Card className="summary-card">
                      <Card.Body>
                        <div className="stat">
                          <div className="stat-value">{data.ctr ?? ((data.totalClicks && data.totalImpressions) ? ((data.totalClicks / data.totalImpressions) * 100).toFixed(2) + '%' : '0%')}</div>
                          <div className="stat-label">CTR</div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </>
            ) : (
              <div className="text-center py-4">No analytics data available</div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>Close</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AdAnalyticsModal;
