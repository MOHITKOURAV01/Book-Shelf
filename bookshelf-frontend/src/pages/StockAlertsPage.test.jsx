import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StockAlertsPage from './StockAlertsPage.jsx';

vi.mock('../utils/api.js', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: [] }) },
}));

vi.mock('../services/stockAlertService.js', () => ({
  unsubscribeStockAlert: vi.fn(),
}));

describe('StockAlertsPage', () => {
  it('renders the page title', () => {
    render(
      <MemoryRouter>
        <StockAlertsPage />
      </MemoryRouter>
    );
    expect(screen.getByText('My Stock Alerts')).toBeInTheDocument();
  });

  it('shows subtitle', () => {
    render(
      <MemoryRouter>
        <StockAlertsPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/waiting to come back/)).toBeInTheDocument();
  });
});
