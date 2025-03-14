import { useState, useEffect } from 'react';
import { UploadOptions } from 'tus-js-client';
import { GroupListResponse, GroupResponseItem } from 'pinata';
import { PinataApi } from '../../../../pinata';
import { getUserDataId } from '../../../../utils';
import showToast from '../../../../utils/toast';
import { useDataStore } from '../store/useDataStore';
import { sendMessage } from '../../../../api';

interface EvaluationResponse {
  params: {
    evaluation: {
      overallScore: number;
      qualifiesForBounty: boolean;
      summary: string;
      detailedFeedback: string;
    };
  }
}

export const useUpload = () => {
  const [uploadResponse, setUploadResponse] = useState<{
    url: string;
    options: UploadOptions;
  } | null>(null);

  const [address, setAddress] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedBounty, setSelectedBounty] = useState<string | null>(null);
  const [groupState, setGroupState] = useState<{
    groups: GroupListResponse | null;
    createGroup: GroupResponseItem | null;
  } | null>(null);
  const [loadingUpload, setLoadingUpload] = useState<boolean>(false);
  const [lastEvaluation, setLastEvaluation] = useState<any>(null);

  // Sử dụng zustand store
  const { selectedData, clearItems } = useDataStore();

  useEffect(() => {
    chrome.storage.local.get('address').then((result) => {
      setAddress(result.address || null);
    });

    chrome.storage.local.get('selectedTopic').then((result) => {
      setSelectedTopic(result.selectedTopic || null);
    });

    chrome.storage.local.get('selectedBounty').then((result) => {
      setSelectedBounty(result.selectedBounty || null);
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.lastEvaluation) {
        setLastEvaluation(changes.lastEvaluation.newValue);
      }
    };

    // Initial load
    chrome.storage.local.get('lastEvaluation').then((result) => {
      setLastEvaluation(result.lastEvaluation);
    });

    // Listen for changes
    chrome.storage.local.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.local.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      if (address && selectedTopic) {
        const groups: GroupListResponse = await PinataApi.getGroupPinataByName(
          getUserDataId(selectedTopic, address)
        );
        console.log("🚀 ~ fetchGroups ~ groups:", groups);
        chrome.storage.local.set({
          groups: groups,
        });
        setGroupState({
          groups: groups,
          createGroup: null,
        });
      }
    };
    fetchGroups();
  }, [address, selectedTopic, groupState?.createGroup]);

  const handleCreateGroup = async (): Promise<GroupResponseItem> => {
    if (!selectedTopic || !address) {
      throw new Error('Missing topic or address');
    }

    const createGroup = await PinataApi.createGroupPublic(
      getUserDataId(selectedTopic, address),
    );
    setGroupState({
      groups: null,
      createGroup: createGroup,
    });
    chrome.storage.local.set({
      createGroup: createGroup,
    });
    return createGroup;
  };

  const handleUploadFile = async (data: any, fileName: string, groupId: string) => {
    if (!data || !fileName || !groupId) {
      throw new Error('Missing required information to upload');
    }

    try {
      const upload = await PinataApi.addFilesToGroupPublic(data, fileName, groupId);
      console.log('Upload result:', upload);
      showToast.success('Upload success!');
      clearItems();
      return upload;
    } catch (error) {
      console.error('Error uploading:', error);
      throw new Error('Upload failed');
    }
  };

  const handleUploadClick = async () => {
    if (loadingUpload) return; // Tránh click nhiều lần

    setLoadingUpload(true);

    try {
      if (!selectedData.length) {
        showToast.warning('Please select at least one item to upload');
        return;
      }

      if (!selectedTopic) {
        showToast.error('Topic not found');
        return;
      }

      let groupId: string;

      // Case: Create group
      if (!groupState?.groups || groupState?.groups.groups.length === 0) {
        try {
          const newGroup: GroupResponseItem = await handleCreateGroup();
          if (!newGroup) {
            throw new Error('Create group failed');
          }
          groupId = newGroup.id;
        } catch (error) {
          console.error('Error creating group:', error);
          showToast.error('Create group failed');
          return;
        }
      } else {
        groupId = Array.isArray(groupState?.groups)
          ? groupState?.groups[0].id
          : groupState?.groups.groups[0].id;
      }

      try {
        await handleUploadFile(
          selectedData.map((node) => node.parsedContext) as unknown as JSON,
          selectedTopic,
          groupId,
        );
      } catch (error) {
        console.error('Error uploading file:', error);
        showToast.error('Upload failed');
      }
    } catch (error) {
      console.error('Error in upload process:', error);
      showToast.error('Upload failed');
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleUploadBounty = async () => {
    if (loadingUpload) return;
    setLoadingUpload(true);

    try {
      if (!selectedData.length) {
        showToast.warning('Please select at least one item to upload');
        return;
      }

      if (!selectedTopic) {
        showToast.error('Topic not found');
        return;
      }

      let groupId: string;

      // Case: Create group
      if (!groupState?.groups || groupState?.groups.groups.length === 0) {
        try {
          const newGroup: GroupResponseItem = await handleCreateGroup();
          if (!newGroup) {
            throw new Error('Create group failed');
          }
          groupId = newGroup.id;
        } catch (error) {
          console.error('Error creating group:', error);
          showToast.error('Create group failed');
          return;
        }
      } else {
        groupId = Array.isArray(groupState?.groups)
          ? groupState?.groups[0].id
          : groupState?.groups.groups[0].id;
      }

      try {
        await handleUploadFile(
          selectedData.map((node) => node.parsedContext) as unknown as JSON,
          selectedTopic,
          groupId,
        );

        const message = `you must use action CHECK_VERIFY data submit: ${selectedData.map((node) => node.parsedContext).map((item) => item.text).join('\n')}
          wallet address: ${address}
          bountyId: ${selectedBounty}
        `;

        const response = await sendMessage(message);
        console.log("Response", response)
        const evaluationData = response[1] as EvaluationResponse;
        console.log("Evaluation data", evaluationData)
        chrome.storage.local.set({ lastEvaluation: evaluationData })

        setLastEvaluation(evaluationData)

      } catch (error) {
        console.error('Error uploading file:', error);
        showToast.error('Upload failed');
      }
    } catch (error) {
      console.error('Error in upload process:', error);
      showToast.error('Upload failed');
    } finally {
      setLoadingUpload(false);
    }
  };

  return {
    groupState,
    uploadResponse,
    loadingUpload,
    handleUploadClick,
    handleUploadBounty,
    lastEvaluation,
  };
};
