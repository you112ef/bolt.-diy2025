import React from 'react';
import { DialogButton, DialogDescription, DialogTitle } from '~/components/ui/Dialog';
import type { ChatHistoryItem } from '~/lib/persistence';

interface BulkDeleteChatDialogContentProps {
  items: ChatHistoryItem[];
  onClose: () => void;
  onConfirm: () => void;
}

const BulkDeleteChatDialogContent: React.FC<BulkDeleteChatDialogContentProps> = ({ items, onClose, onConfirm }) => {
  return (
    <>
      <div className="p-6 bg-white dark:bg-gray-950">
        <DialogTitle className="text-gray-900 dark:text-white">Delete Selected Chats?</DialogTitle>
        <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
          <p>
            You are about to delete {items.length}{' '}
            {items.length === 1 ? 'chat' : 'chats'}:
          </p>
          <div className="mt-2 max-h-32 overflow-auto border border-gray-100 dark:border-gray-800 rounded-md bg-gray-50 dark:bg-gray-900 p-2">
            <ul className="list-disc pl-5 space-y-1">
              {items.map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3">Are you sure you want to delete these chats?</p>
        </DialogDescription>
      </div>
      <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
        <DialogButton type="secondary" onClick={onClose}>
          Cancel
        </DialogButton>
        <DialogButton
          type="danger"
          onClick={onConfirm}
        >
          Delete
        </DialogButton>
      </div>
    </>
  );
};

export default BulkDeleteChatDialogContent;
