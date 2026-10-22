// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/confirmDialog.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// Component test with a real DOM: the confirmation dialog is what stands
// between an operator and an irreversible robot command, so its roles,
// focus handling and keyboard behaviour are checked as rendered.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '../src/i18n';
import { ConfirmDialog } from '../src/components/ConfirmDialog';

afterEach(cleanup);

function renderDialog(props: Partial<Parameters<typeof ConfirmDialog>[0]> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(<ConfirmDialog open message="Delete every point?" onConfirm={onConfirm} onCancel={onCancel} {...props} />);
  return { onConfirm, onCancel, ...view };
}

describe('ConfirmDialog', () => {
  it('renders nothing while closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a modal dialog named by its title and described by its message', () => {
    renderDialog();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(document.getElementById(labelledBy ?? '')?.textContent).toBe('Confirm');
    expect(document.getElementById(describedBy ?? '')?.textContent).toBe('Delete every point?');
  });

  it('puts the focus on the safe button, Cancel', () => {
    renderDialog();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });

  it('Escape cancels without confirming', () => {
    const { onCancel, onConfirm } = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('Tab wraps inside the dialog in both directions', () => {
    renderDialog();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getByRole('button', { name: 'Confirm' });
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(confirm);
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(cancel);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(confirm);
  });

  it('the buttons call their own handler and a click on the backdrop cancels', () => {
    const { onCancel, onConfirm, container } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.mouseDown(container.firstElementChild as Element);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('returns the focus to the control that opened it', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { rerender, onConfirm, onCancel } = renderDialog();
    rerender(<ConfirmDialog open={false} message="x" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
