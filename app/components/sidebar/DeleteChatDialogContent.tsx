import React from 'react';
import { DialogButton, DialogDescription, DialogTitle } from '~/components/ui/Dialog';
import type { ChatHistoryItem } from '~/lib/persistence';

interface DeleteChatDialogContentProps {
  item: ChatHistoryItem;
  onClose: () => void;
  onConfirm: (event: React.UIEvent) => void;
}

const DeleteChatDialogContent: React.FC<DeleteChatDialogContentProps> = ({ item, onClose, onConfirm }) => {
  return (
    <>
      <div className="p-6 bg-white dark:bg-gray-950">
        <DialogTitle className="text-gray-900 dark:text-white">Delete Chat?</DialogTitle>
        <DialogDescription className="mt-2 text-gray-600 dark:text-gray-400">
          <p>
            You are about to delete{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {item.description}
            </span>
          </p>
          <p className="mt-2">Are you sure you want to delete this chat?</p>
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

export default DeleteChatDialogContent;
