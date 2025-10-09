import { useState, useEffect, useRef } from "react";
import {
    Box,
    Flex,
    Heading,
    Text,
    TextField,
    Container,
    TextArea,
} from "@radix-ui/themes";

import {
    Button,
    Card,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    Select,
    SelectItem,
    SelectTrigger,
    SelectContent,
    SelectValue,
    Switch,
} from "@/components/ui";

import { BellIcon, PlusIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getAllMonitors } from "../../api/monitors";
import { Monitor } from "../../types/monitors";
import { getAllAgents } from "../../api/agents";
import { Agent } from "../../types/agents";
import {
    getNotificationConfig,
    saveNotificationSettings,
    createNotificationChannel,
    updateNotificationChannel,
    deleteNotificationChannel,
    createNotificationTemplate,
    updateNotificationTemplate,
    deleteNotificationTemplate,
    NotificationChannel as ApiNotificationChannel,
    NotificationTemplate as ApiNotificationTemplate,
    NotificationSettings as ApiNotificationSettings,
} from "../../api/notifications";
import ChannelSelector from "../../components/ChannelSelector";

const NotificationsConfig = () => {
    // 状态管理
    const [channels, setChannels] = useState<ApiNotificationChannel[]>([]);
    const [templates, setTemplates] = useState<ApiNotificationTemplate[]>([]);
    const [settings, setSettings] = useState<ApiNotificationSettings | null>(
        null
    );
    const [monitors, setMonitors] = useState<Monitor[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [monitorsLoading, setMonitorsLoading] = useState(true);
    const [agentsLoading, setAgentsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // 渠道管理状态
    const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
    const [isEditChannelOpen, setIsEditChannelOpen] = useState(false);
    const [isDeleteChannelOpen, setIsDeleteChannelOpen] = useState(false);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(
      null
    );
    const [channelForm, setChannelForm] = useState({
      name: "",
      type: "telegram",
      config: {
        botToken: "",
        chatId: "",
        apiKey: "",
        from: "",
        to: "",
        webhookUrl: "",
      },
      enabled: true,
    });
    const [channelFormErrors, setChannelFormErrors] = useState({
        name: "",
        botToken: "",
        chatId: "",
        apiKey: "",
        from: "",
        to: "",
        webhookUrl: "",
    });

    // 模板管理状态
    const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
    const [isDeleteTemplateOpen, setIsDeleteTemplateOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] =
        useState<ApiNotificationTemplate | null>(null);
    const [templateForm, setTemplateForm] = useState({
        name: "",
        type: "monitor",
        subject: "",
        content: "",
    });

    const contentTextAreaRef = useRef<HTMLTextAreaElement>(null);

    const { t } = useTranslation();

    // 模板变量
    const templateVariables = [
        "${name}",
        "${status}",
        "${previous_status}",
        "${time}",
        "${url}",
        "${response_time}",
        "${status_code}",
        "${expected_status}",
        "${error}",
        "${details}",
        "${hostname}",
        "${ip_addresses}",
        "${os}",
    ];

    useEffect(() => {
        loadData();
        loadMonitorsAndAgents();
    }, [t]);

    // 加载所有配置数据
    const loadData = async () => {
        try {
            setLoading(true);
            const configResponse = await getNotificationConfig();

            if (configResponse.success && configResponse.data) {
                setChannels(configResponse.data.channels);
                setTemplates(configResponse.data.templates);
                setSettings(configResponse.data.settings);
            } else {
                console.error("获取通知配置失败:", configResponse.message);
                toast.error(t("notifications.fetch.error"));
            }
        } catch (error) {
            console.error("加载通知设置失败", error);
            toast.error(t("notifications.fetch.error"));
        } finally {
            setLoading(false);
        }
    };

    // 加载监控和客户端数据
    const loadMonitorsAndAgents = async () => {
        setMonitorsLoading(true);
        setAgentsLoading(true);

        const monitorsResponse = await getAllMonitors();
        if (monitorsResponse.success && monitorsResponse.monitors) {
            setMonitors(monitorsResponse.monitors);
        } else {
            console.error("获取监控数据失败:", monitorsResponse.message);
        }
        setMonitorsLoading(false);

        const agentsResponse = await getAllAgents();
        if (agentsResponse.success && agentsResponse.agents) {
            setAgents(agentsResponse.agents);
        }
        setAgentsLoading(false);
    };

    // 处理全局监控设置变更
    const handleMonitorSettingChange = (key: string, value: any) => {
        if (!settings) return;

        setSettings({
            ...settings,
            monitors: {
                ...settings.monitors,
                [key]: value,
            },
        });
    };

    // 处理全局客户端设置变更
    const handleAgentSettingChange = (key: string, value: any) => {
        if (!settings) return;

        setSettings({
            ...settings,
            agents: {
                ...settings.agents,
                [key]: value,
            },
        });
    };

    // 处理特定监控设置变更
    const handleSpecificMonitorSettingChange = (
        monitorId: string,
        key: string,
        value: any
    ) => {
        if (!settings) return;

        const currentSettings = settings.specificMonitors[monitorId] || {
            enabled: false,
            onDown: false,
            onRecovery: false,
            channels: [],
        };

        let updatedSettings = {
            ...currentSettings,
            [key]: value,
        };

        setSettings({
            ...settings,
            specificMonitors: {
                ...settings.specificMonitors,
                [monitorId]: updatedSettings,
            },
        });
    };

    // 处理特定客户端设置变更
    const handleSpecificAgentSettingChange = (
        agentId: string,
        key: string,
        value: any
    ) => {
        if (!settings) return;

        const currentSettings = settings.specificAgents[agentId] || {
            enabled: false,
            onOffline: false,
            onRecovery: false,
            onCpuThreshold: false,
            cpuThreshold: 90,
            onMemoryThreshold: false,
            memoryThreshold: 85,
            onDiskThreshold: false,
            diskThreshold: 90,
            channels: [],
        };

        let updatedSettings = {
            ...currentSettings,
            [key]: value,
        };

        setSettings({
            ...settings,
            specificAgents: {
                ...settings.specificAgents,
                [agentId]: updatedSettings,
            },
        });
    };

    // 保存所有设置
    const handleSave = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            const response = await saveNotificationSettings(settings);

            if (response.success) {
                toast.success(t("notifications.save.success"));
            } else {
                toast.error(t("notifications.save.error"));
            }
        } catch (err) {
            console.error("保存通知设置失败", err);
            toast.error(t("notifications.save.error"));
        } finally {
            setSaving(false);
        }
    };
    
    // 打开新增渠道对话框
    const handleAddChannelClick = () => {
        setChannelForm({
            name: "",
            type: "telegram",
            config: {
                botToken: "",
                chatId: "",
                apiKey: "",
                from: "",
                to: "",
                webhookUrl: "",
            },
            enabled: true,
        });
        setChannelFormErrors({
            name: "",
            botToken: "",
            chatId: "",
            apiKey: "",
            from: "",
            to: "",
            webhookUrl: "",
        });
        setIsAddChannelOpen(true);
    };
    
    // 打开编辑渠道对话框
    const handleEditChannelClick = (channel: ApiNotificationChannel) => {
        if (!channel.id || isNaN(Number(channel.id))) {
            console.error("无效的渠道ID:", channel.id);
            toast.error(t("notifications.channels.invalidId"));
            return;
        }

        setSelectedChannelId(channel.id);

        let config = channel.config || {};
        if (typeof config === "string") {
            try {
                config = JSON.parse(config);
            } catch (e) {
                console.error(`解析渠道类型${channel.type}的配置失败:`, e);
                config = {};
            }
        }
        
        setChannelForm({
            name: channel.name,
            type: channel.type,
            config: {
                botToken: config.botToken || "",
                chatId: config.chatId || "",
                apiKey: config.apiKey || "",
                from: config.from || "",
                to: config.to || "",
                webhookUrl: config.webhookUrl || "",
            },
            enabled: channel.enabled,
        });
        setChannelFormErrors({
            name: "",
            botToken: "",
            chatId: "",
            apiKey: "",
            from: "",
            to: "",
            webhookUrl: "",
        });
        setIsEditChannelOpen(true);
    };

    // 打开删除渠道对话框
    const handleDeleteChannelClick = (channelId: string) => {
        if (!channelId || isNaN(Number(channelId))) {
            console.error("无效的渠道ID:", channelId);
            toast.error(t("notifications.channels.invalidId"));
            return;
        }

        setSelectedChannelId(channelId);
        setIsDeleteChannelOpen(true);
    };

    // 验证渠道表单
    const validateChannelForm = (): boolean => {
        const errors = {
            name: "",
            botToken: "",
            chatId: "",
            apiKey: "",
            from: "",
            to: "",
            webhookUrl: "",
        };

        let isValid = true;

        if (!channelForm.name.trim()) {
            errors.name = t("notifications.channels.errors.nameRequired");
            isValid = false;
        }

        if (channelForm.type === "telegram") {
            if (!channelForm.config.botToken.trim()) {
                errors.botToken = t("notifications.channels.errors.botTokenRequired");
                isValid = false;
            }
            if (!channelForm.config.chatId.trim()) {
                errors.chatId = t("notifications.channels.errors.chatIdRequired");
                isValid = false;
            }
        }

        if (channelForm.type === "resend") {
            if (!channelForm.config.apiKey.trim()) {
                errors.apiKey = t("notifications.channels.errors.apiKeyRequired");
                isValid = false;
            }
            if (!channelForm.config.from.trim()) {
                errors.from = t("notifications.channels.errors.fromRequired");
                isValid = false;
            }
            if (!channelForm.config.to.trim()) {
                errors.to = t("notifications.channels.errors.toRequired");
                isValid = false;
            }
        }
        
        if (channelForm.type === "feishu" || channelForm.type === "wecom") {
            if (!channelForm.config.webhookUrl.trim()) {
                errors.webhookUrl = t("notifications.channels.errors.webhookUrlRequired");
                isValid = false;
            }
        }

        setChannelFormErrors(errors);
        return isValid;
    };

    // 保存渠道
    const handleSaveChannel = async () => {
        if (!validateChannelForm()) return;
    
        setSaving(true);
        try {
            const channelData = {
                name: channelForm.name,
                type: channelForm.type,
                enabled: channelForm.enabled,
                config: channelForm.config, // 直接传递对象
            };
    
            if (isEditChannelOpen && selectedChannelId) {
                const response = await updateNotificationChannel(selectedChannelId, channelData);
                if (response.success) {
                    toast.success(t("notifications.channels.updateSuccess"));
                    await loadData();
                    setIsEditChannelOpen(false);
                } else {
                    toast.error(t("notifications.channels.saveError"));
                }
            } else {
                const response = await createNotificationChannel(channelData);
                if (response.success) {
                    toast.success(t("notifications.channels.createSuccess"));
                    await loadData();
                    setIsAddChannelOpen(false);
                } else {
                    toast.error(t("notifications.channels.saveError"));
                }
            }
        } catch (error) {
            toast.error(t("notifications.channels.saveError"));
        } finally {
            setSaving(false);
        }
    };
    
    // 确认删除渠道
    const handleConfirmDeleteChannel = async () => {
        if (!selectedChannelId) return;
        setSaving(true);
        try {
            const response = await deleteNotificationChannel(selectedChannelId);
            if (response.success) {
                toast.success(t("notifications.channels.deleteSuccess"));
                await loadData();
            } else {
                toast.error(t("notifications.channels.deleteError"));
            }
            setIsDeleteChannelOpen(false);
        } catch (error) {
            toast.error(t("notifications.channels.deleteError"));
        } finally {
            setSaving(false);
        }
    };


    // 模板操作
    const handleAddTemplateClick = () => {
        setSelectedTemplate(null);
        setTemplateForm({
            name: "",
            type: "monitor",
            subject: "",
            content: "",
        });
        setIsTemplateDialogOpen(true);
    };

    const handleEditTemplateClick = (template: ApiNotificationTemplate) => {
        setSelectedTemplate(template);
        setTemplateForm({
            name: template.name,
            type: template.type,
            subject: template.subject,
            content: template.content,
        });
        setIsTemplateDialogOpen(true);
    };

    const handleDeleteTemplateClick = (template: ApiNotificationTemplate) => {
        setSelectedTemplate(template);
        setIsDeleteTemplateOpen(true);
    };

    // 保存模板
    const handleSaveTemplate = async () => {
        setSaving(true);
        try {
            if (selectedTemplate) {
                // 更新模板
                const response = await updateNotificationTemplate(
                    selectedTemplate.id,
                    templateForm
                );
                if (response.success) {
                    toast.success(t("notifications.templates.updateSuccess"));
                    await loadData();
                } else {
                    toast.error(t("notifications.templates.updateError"));
                }
            } else {
                // 创建新模板
                const response = await createNotificationTemplate({ ...templateForm, isDefault: false });
                if (response.success) {
                    toast.success(t("notifications.templates.createSuccess"));
                    await loadData();
                } else {
                    toast.error(t("notifications.templates.createError"));
                }
            }
            setIsTemplateDialogOpen(false);
        } catch (error) {
            toast.error(t("notifications.templates.saveError"));
        } finally {
            setSaving(false);
        }
    };

    // 确认删除模板
    const handleConfirmDeleteTemplate = async () => {
        if (!selectedTemplate) return;
        setSaving(true);
        try {
            const response = await deleteNotificationTemplate(selectedTemplate.id);
            if (response.success) {
                toast.success(t("notifications.templates.deleteSuccess"));
                await loadData();
            } else {
                toast.error(t("notifications.templates.deleteError"));
            }
            setIsDeleteTemplateOpen(false);
        } catch (error) {
            toast.error(t("notifications.templates.deleteError"));
        } finally {
            setSaving(false);
        }
    };
    
    // 插入模板变量
    const insertVariable = (variable: string) => {
        if (contentTextAreaRef.current) {
            const start = contentTextAreaRef.current.selectionStart;
            const end = contentTextAreaRef.current.selectionEnd;
            const text = contentTextAreaRef.current.value;
            const newText =
                text.substring(0, start) + variable + text.substring(end);
            setTemplateForm({ ...templateForm, content: newText });
            contentTextAreaRef.current.focus();
        }
    };

    // 渲染渠道Tab
    const renderChannelsTab = () => {
        if (!settings) return <Text>{t("common.loading")}...</Text>;

        return (
            <Flex direction="column" gap="2">
                <Text className="text-sm text-gray-600">
                    {t("notifications.channels.tabDescription")}
                </Text>

                <Box p="2">
                    <Flex className="justify-between items-center mb-2">
                        <Text className="text-lg">{t("notifications.channels.title")}</Text>
                        <Button
                            className="ml-auto"
                            variant="secondary"
                            onClick={handleAddChannelClick}
                        >
                            <PlusIcon width="16" height="16" />
                            {t("notifications.channels.add")}
                        </Button>
                    </Flex>

                    <Box>
                        <Flex py="2" direction="column" gap="2">
                            <Text className="text-gray-600 mb-3">
                                {t("notifications.channels.description")}
                            </Text>

                            {channels.length === 0 ? (
                                <Text color="gray">
                                    {t("notifications.channels.noChannels")}
                                </Text>
                            ) : (
                                <Flex direction="column" gap="2">
                                    {channels.map((channel) => (
                                        <Card key={channel.id} className="px-2">
                                            <Flex className="justify-between items-center">
                                                <Flex direction="column" gap="1" className="grow">
                                                    <Flex gap="2" align="center" className="break-all">
                                                        <Text className="text-lg">{channel.name}</Text>
                                                    </Flex>
                                                    <Text className="text-xs text-gray-600">
                                                        {t(`notifications.channels.type.${channel.type}`)}
                                                    </Text>
                                                </Flex>
                                                <Flex gap="2">
                                                    <Button
                                                        variant="secondary"
                                                        className="ml-auto"
                                                        onClick={() => handleEditChannelClick(channel)}
                                                    >
                                                        {t("common.edit")}
                                                    </Button>
                                                    <Button
                                                        className="ml-auto"
                                                        variant="secondary"
                                                        onClick={() => handleDeleteChannelClick(channel.id)}
                                                    >
                                                        {t("common.delete")}
                                                    </Button>
                                                </Flex>
                                            </Flex>
                                        </Card>
                                    ))}
                                </Flex>
                            )}
                        </Flex>
                    </Box>
                </Box>
            </Flex>
        );
    };

    // 渲染模板Tab
    const renderTemplatesTab = () => {
        if (!settings) return <Text>{t("common.loading")}...</Text>;

        return (
            <Flex direction="column" gap="2">
                <Text size="2" color="gray" mb="3">
                    {t("notifications.templates.tabDescription")}
                </Text>

                <Box>
                    <Flex justify="between" align="center" mb="3">
                        <Heading size="3">{t("notifications.templates.title")}</Heading>
                        <Button variant="secondary" onClick={handleAddTemplateClick}>
                            <PlusIcon width="16" height="16" />
                            {t("notifications.templates.add")}
                        </Button>
                    </Flex>

                    <Box>
                        <Text size="2" color="gray" mb="3">
                            {t("notifications.templates.description")}
                        </Text>

                        {templates.length === 0 ? (
                            <Text color="gray">{t("notifications.templates.noTemplates")}</Text>
                        ) : (
                            <Flex direction="column" gap="3">
                                {templates.map((template) => (
                                    <Card key={template.id} className="px-4">
                                        <Flex direction="column" gap="3">
                                            <Flex justify="between" align="center">
                                                <Flex gap="2" align="center">
                                                    <Text weight="medium">{template.name}</Text>
                                                    {template.isDefault && (
                                                        <Text size="1">
                                                            {t("notifications.templates.defaultTemplate")}
                                                        </Text>
                                                    )}
                                                </Flex>
                                                <Flex gap="2">
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleEditTemplateClick(template)}
                                                    >
                                                        {t("common.edit")}
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => handleDeleteTemplateClick(template)}
                                                        disabled={template.isDefault}
                                                    >
                                                        {t("common.delete")}
                                                    </Button>
                                                </Flex>
                                            </Flex>
                                            <Box>
                                                <Text size="2" weight="medium">
                                                    {t("notifications.templates.subject")}:
                                                </Text>
                                                <Text size="2">{template.subject}</Text>
                                            </Box>
                                            <Box>
                                                <Text size="2" weight="medium">
                                                    {t("notifications.templates.content")}:
                                                </Text>
                                                <Box>{template.content}</Box>
                                            </Box>
                                        </Flex>
                                    </Card>
                                ))}
                            </Flex>
                        )}
                    </Box>
                </Box>
            </Flex>
        );
    };

    // 渲染全局设置Tab
    const renderGlobalSettingsTab = () => {
        if (!settings) return <Text>{t("common.loading")}...</Text>;

        return (
            <Flex direction="column" gap="2">
                <Text className="text-sm">
                    {t("notifications.globalSettings.description")}
                </Text>
                <Box>
                    <Text className="text-lg">
                        {t("notifications.settings.monitors")}
                    </Text>
                    <Card className="mt-2">
                        <Box p="1">
                            <Flex direction="column" gap="1" className="px-2">
                                <Flex justify="between" align="center">
                                    <Box>
                                        <Text className="text-base">
                                            {t("notifications.settings.monitors")}
                                        </Text>
                                        <Text className="text-sm text-gray-600">
                                            {t("notifications.settings.monitors.description")}
                                        </Text>
                                    </Box>
                                    <Switch
                                        checked={settings.monitors.enabled}
                                        onCheckedChange={(checked) =>
                                            handleMonitorSettingChange("enabled", checked)
                                        }
                                    />
                                </Flex>
                                {settings.monitors.enabled && (
                                    <Box pl="4">
                                        <Flex direction="column" gap="3">
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={settings.monitors.onDown}
                                                    onCheckedChange={(checked) =>
                                                        handleMonitorSettingChange("onDown", checked)
                                                    }
                                                />
                                                <Text className="text-xs">
                                                    {t("notifications.events.onDownOnly")}
                                                </Text>
                                            </Flex>
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={settings.monitors.onRecovery}
                                                    onCheckedChange={(checked) =>
                                                        handleMonitorSettingChange("onRecovery", checked)
                                                    }
                                                />
                                                <Text className="text-xs">
                                                    {t("notifications.events.onRecovery")}
                                                </Text>
                                            </Flex>
                                            <Box>
                                                <Text className="text-xs mb-2">
                                                    {t("notifications.specificSettings.channels")}
                                                </Text>
                                                <ChannelSelector
                                                    channels={channels}
                                                    selectedChannelIds={settings.monitors.channels}
                                                    onChange={(channelIds: string[]) =>
                                                        handleMonitorSettingChange("channels", channelIds)
                                                    }
                                                />
                                            </Box>
                                        </Flex>
                                    </Box>
                                )}
                            </Flex>
                        </Box>
                    </Card>
                </Box>
                <Box>
                    <Text className="text-lg mb-2">
                        {t("notifications.settings.agents")}
                    </Text>
                    <Card className="mt-2">
                        <Box p="1">
                            <Flex direction="column" gap="4" className="px-2">
                                <Flex justify="between" align="center">
                                    <Box>
                                        <Text className="text-base">
                                            {t("notifications.settings.agents")}
                                        </Text>
                                        <Text className="text-sm text-gray-600">
                                            {t("notifications.settings.agents.description")}
                                        </Text>
                                    </Box>
                                    <Switch
                                        checked={settings.agents.enabled}
                                        onCheckedChange={(checked) =>
                                            handleAgentSettingChange("enabled", checked)
                                        }
                                    />
                                </Flex>
                                {settings.agents.enabled && (
                                    <Box pl="4">
                                        <Flex direction="column" gap="3">
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={settings.agents.onOffline}
                                                    onCheckedChange={(checked) =>
                                                        handleAgentSettingChange("onOffline", checked)
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onOffline")}
                                                </Text>
                                            </Flex>
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={settings.agents.onRecovery}
                                                    onCheckedChange={(checked) =>
                                                        handleAgentSettingChange("onRecovery", checked)
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onRecoveryAgent")}
                                                </Text>
                                            </Flex>
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={settings.agents.onCpuThreshold}
                                                    onCheckedChange={(checked) =>
                                                        handleAgentSettingChange("onCpuThreshold", checked)
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onCpuThreshold")}
                                                </Text>
                                            </Flex>
                                            {settings.agents.onCpuThreshold && (
                                                <Flex pl="6" align="center" gap="2">
                                                    <Text size="2">
                                                        {t("notifications.threshold.label")}
                                                    </Text>
                                                    <TextField.Input
                                                        size="1"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={settings.agents.cpuThreshold.toString()}
                                                        onChange={(e) =>
                                                            handleAgentSettingChange(
                                                                "cpuThreshold",
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                    />
                                                    <Text size="2">
                                                        {t("notifications.threshold.percent")}
                                                    </Text>
                                                </Flex>
                                            )}
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={settings.agents.onMemoryThreshold}
                                                    onCheckedChange={(checked) =>
                                                        handleAgentSettingChange(
                                                            "onMemoryThreshold",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onMemoryThreshold")}
                                                </Text>
                                            </Flex>
                                            {settings.agents.onMemoryThreshold && (
                                                <Flex pl="6" align="center" gap="2">
                                                    <Text size="2">
                                                        {t("notifications.threshold.label")}
                                                    </Text>
                                                    <TextField.Input
                                                        size="1"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={settings.agents.memoryThreshold.toString()}
                                                        onChange={(e) =>
                                                            handleAgentSettingChange(
                                                                "memoryThreshold",
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                    />
                                                    <Text size="2">
                                                        {t("notifications.threshold.percent")}
                                                    </Text>
                                                </Flex>
                                            )}
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={settings.agents.onDiskThreshold}
                                                    onCheckedChange={(checked) =>
                                                        handleAgentSettingChange("onDiskThreshold", checked)
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onDiskThreshold")}
                                                </Text>
                                            </Flex>
                                            {settings.agents.onDiskThreshold && (
                                                <Flex pl="6" align="center" gap="2">
                                                    <Text size="2">
                                                        {t("notifications.threshold.label")}
                                                    </Text>
                                                    <TextField.Input
                                                        size="1"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={settings.agents.diskThreshold.toString()}
                                                        onChange={(e) =>
                                                            handleAgentSettingChange(
                                                                "diskThreshold",
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                    />
                                                    <Text size="2">
                                                        {t("notifications.threshold.percent")}
                                                    </Text>
                                                </Flex>
                                            )}
                                            <Box>
                                                <Text size="2" weight="medium" mb="2">
                                                    {t("notifications.specificSettings.channels")}
                                                </Text>
                                                <ChannelSelector
                                                    channels={channels}
                                                    selectedChannelIds={settings.agents.channels}
                                                    onChange={(channelIds) =>
                                                        handleAgentSettingChange("channels", channelIds)
                                                    }
                                                />
                                            </Box>
                                        </Flex>
                                    </Box>
                                )}
                            </Flex>
                        </Box>
                    </Card>
                </Box>
            </Flex>
        );
    };

    // 渲染特定监控设置Tab
    const renderSpecificMonitorsTab = () => {
        if (!settings) return <Text>{t("common.loading")}...</Text>;
        if (monitorsLoading) return <Text>{t("common.loading")}...</Text>;

        if (monitors.length === 0) {
            return <Text color="gray">{t("monitors.noMonitors")}</Text>;
        }

        return (
            <Flex direction="column" gap="2">
                <Text size="2" color="gray" mb="3">
                    {t("notifications.specificMonitors.description")}
                </Text>

                {monitors.map((monitor) => {
                    const monitorId = monitor.id.toString();
                    const specificSettings = settings.specificMonitors[monitorId] || {
                        enabled: false,
                        onDown: false,
                        onRecovery: false,
                        channels: [],
                    };

                    return (
                        <Card key={monitorId} className="px-4">
                            <Flex direction="column" gap="3">
                                <Flex justify="between" align="center">
                                    <Box>
                                        <Text weight="medium">{monitor.name}</Text>
                                        <Text size="1" color="gray">
                                            {monitor.url}
                                        </Text>
                                    </Box>
                                    <Switch
                                        checked={specificSettings.enabled}
                                        onCheckedChange={(checked) =>
                                            handleSpecificMonitorSettingChange(
                                                monitorId,
                                                "enabled",
                                                checked
                                            )
                                        }
                                    />
                                </Flex>

                                {specificSettings.enabled && (
                                    <Box pl="4">
                                        <Flex direction="column" gap="3">
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={specificSettings.onDown}
                                                    onCheckedChange={(checked) =>
                                                        handleSpecificMonitorSettingChange(
                                                            monitorId,
                                                            "onDown",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onDownOnly")}
                                                </Text>
                                            </Flex>
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={specificSettings.onRecovery}
                                                    onCheckedChange={(checked) =>
                                                        handleSpecificMonitorSettingChange(
                                                            monitorId,
                                                            "onRecovery",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onRecovery")}
                                                </Text>
                                            </Flex>
                                            <Box>
                                                <Text size="2" weight="medium" mb="2">
                                                    {t("notifications.specificSettings.channels")}
                                                </Text>
                                                <ChannelSelector
                                                    channels={channels}
                                                    selectedChannelIds={specificSettings.channels}
                                                    onChange={(channelIds) =>
                                                        handleSpecificMonitorSettingChange(
                                                            monitorId,
                                                            "channels",
                                                            channelIds
                                                        )
                                                    }
                                                />
                                            </Box>
                                        </Flex>
                                    </Box>
                                )}
                            </Flex>
                        </Card>
                    );
                })}
            </Flex>
        );
    };

    // 渲染特定客户端设置Tab
    const renderSpecificAgentsTab = () => {
        if (!settings) return <Text>{t("common.loading")}...</Text>;
        if (agentsLoading) return <Text>{t("common.loading")}...</Text>;

        if (agents.length === 0) {
            return <Text color="gray">{t("agents.noAgents")}</Text>;
        }

        return (
            <Flex direction="column" gap="2">
                <Text size="2" color="gray" mb="3">
                    {t("notifications.specificAgents.description")}
                </Text>

                {agents.map((agent) => {
                    const agentId = agent.id.toString();
                    const specificSettings = settings.specificAgents[agentId] || {
                        enabled: false,
                        onOffline: false,
                        onRecovery: false,
                        onCpuThreshold: false,
                        cpuThreshold: 90,
                        onMemoryThreshold: false,
                        memoryThreshold: 85,
                        onDiskThreshold: false,
                        diskThreshold: 90,
                        channels: [],
                    };

                    return (
                        <Card key={agentId} className="px-4">
                            <Flex direction="column" gap="3">
                                <Flex justify="between" align="center">
                                    <Box>
                                        <Text weight="medium">{agent.name}</Text>
                                        <Text size="1" color="gray">
                                            {(() => {
                                                try {
                                                    const ipArray = JSON.parse(
                                                        String(agent.ip_addresses || "[]")
                                                    );
                                                    return Array.isArray(ipArray) && ipArray.length > 0
                                                        ? ipArray.join(", ")
                                                        : String(agent.ip_addresses || "");
                                                } catch (e) {
                                                    return String(agent.ip_addresses || "");
                                                }
                                            })()}
                                        </Text>
                                    </Box>
                                    <Switch
                                        checked={specificSettings.enabled}
                                        onCheckedChange={(checked) =>
                                            handleSpecificAgentSettingChange(
                                                agentId,
                                                "enabled",
                                                checked
                                            )
                                        }
                                    />
                                </Flex>
                                {specificSettings.enabled && (
                                    <Box pl="4">
                                        <Flex direction="column" gap="3">
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={specificSettings.onOffline}
                                                    onCheckedChange={(checked) =>
                                                        handleSpecificAgentSettingChange(
                                                            agentId,
                                                            "onOffline",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onOffline")}
                                                </Text>
                                            </Flex>
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={specificSettings.onRecovery}
                                                    onCheckedChange={(checked) =>
                                                        handleSpecificAgentSettingChange(
                                                            agentId,
                                                            "onRecovery",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onRecoveryAgent")}
                                                </Text>
                                            </Flex>
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={specificSettings.onCpuThreshold}
                                                    onCheckedChange={(checked) =>
                                                        handleSpecificAgentSettingChange(
                                                            agentId,
                                                            "onCpuThreshold",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onCpuThreshold")}
                                                </Text>
                                            </Flex>
                                            {specificSettings.onCpuThreshold && (
                                                <Flex pl="6" align="center" gap="2">
                                                    <Text size="2">
                                                        {t("notifications.threshold.label")}
                                                    </Text>
                                                    <TextField.Input
                                                        size="1"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={specificSettings.cpuThreshold.toString()}
                                                        onChange={(e) =>
                                                            handleSpecificAgentSettingChange(
                                                                agentId,
                                                                "cpuThreshold",
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                    />
                                                    <Text size="2">
                                                        {t("notifications.threshold.percent")}
                                                    </Text>
                                                </Flex>
                                            )}
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={specificSettings.onMemoryThreshold}
                                                    onCheckedChange={(checked) =>
                                                        handleSpecificAgentSettingChange(
                                                            agentId,
                                                            "onMemoryThreshold",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onMemoryThreshold")}
                                                </Text>
                                            </Flex>
                                            {specificSettings.onMemoryThreshold && (
                                                <Flex pl="6" align="center" gap="2">
                                                    <Text size="2">
                                                        {t("notifications.threshold.label")}
                                                    </Text>
                                                    <TextField.Input
                                                        size="1"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={specificSettings.memoryThreshold.toString()}
                                                        onChange={(e) =>
                                                            handleSpecificAgentSettingChange(
                                                                agentId,
                                                                "memoryThreshold",
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                    />
                                                    <Text size="2">
                                                        {t("notifications.threshold.percent")}
                                                    </Text>
                                                </Flex>
                                            )}
                                            <Flex align="center" gap="2">
                                                <Switch
                                                    checked={specificSettings.onDiskThreshold}
                                                    onCheckedChange={(checked) =>
                                                        handleSpecificAgentSettingChange(
                                                            agentId,
                                                            "onDiskThreshold",
                                                            checked
                                                        )
                                                    }
                                                />
                                                <Text size="2">
                                                    {t("notifications.events.onDiskThreshold")}
                                                </Text>
                                            </Flex>
                                            {specificSettings.onDiskThreshold && (
                                                <Flex pl="6" align="center" gap="2">
                                                    <Text size="2">
                                                        {t("notifications.threshold.label")}
                                                    </Text>
                                                    <TextField.Input
                                                        size="1"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        value={specificSettings.diskThreshold.toString()}
                                                        onChange={(e) =>
                                                            handleSpecificAgentSettingChange(
                                                                agentId,
                                                                "diskThreshold",
                                                                Number(e.target.value)
                                                            )
                                                        }
                                                    />
                                                    <Text size="2">
                                                        {t("notifications.threshold.percent")}
                                                    </Text>
                                                </Flex>
                                            )}
                                            <Box>
                                                <Text size="2" weight="medium" mb="2">
                                                    {t("notifications.specificSettings.channels")}
                                                </Text>
                                                <ChannelSelector
                                                    channels={channels}
                                                    selectedChannelIds={specificSettings.channels}
                                                    onChange={(channelIds) =>
                                                        handleSpecificAgentSettingChange(
                                                            agentId,
                                                            "channels",
                                                            channelIds
                                                        )
                                                    }
                                                />
                                            </Box>
                                        </Flex>
                                    </Box>
                                )}
                            </Flex>
                        </Card>
                    );
                })}
            </Flex>
        );
    };

    // 渲染渠道对话框
    const renderChannelDialog = () => {
        const isOpen = isAddChannelOpen || isEditChannelOpen;
        const title = isEditChannelOpen ? t("notifications.channels.edit") : t("notifications.channels.add");

        return (
            <Dialog open={isOpen} onOpenChange={(open) => {
                if (!open) {
                    setIsAddChannelOpen(false);
                    setIsEditChannelOpen(false);
                }
            }}>
                <DialogContent>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{t("notifications.channels.dialogDescription")}</DialogDescription>
                    <Flex direction="column" gap="3" mt="4">
                        <TextField.Input
                            placeholder={t("notifications.channels.name")}
                            value={channelForm.name}
                            onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                        />
                        {channelFormErrors.name && <Text size="1" color="red">{channelFormErrors.name}</Text>}
                        <Select
                            value={channelForm.type}
                            onValueChange={(value) => setChannelForm({ ...channelForm, type: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                  		<SelectContent>
                    		<SelectItem value="telegram">
      		                {t("notifications.channels.type.telegram")}
 		                   </SelectItem>
     		               <SelectItem value="resend">
     		                 {t("notifications.channels.type.resend")}
     		               </SelectItem>
          		          <SelectItem value="feishu">
         		             {t("notifications.channels.type.feishu")}
         		           </SelectItem>
         		           <SelectItem value="wecom">
         		             {t("notifications.channels.type.wecom")}
         		           </SelectItem>
          		          <SelectItem value="webhook" disabled>
             		         {t("notifications.channels.type.webhook")} (Coming Soon)
         		           </SelectItem>
              		      <SelectItem value="slack" disabled>
           		           {t("notifications.channels.type.slack")} (Coming Soon)
          		          </SelectItem>
         		           <SelectItem value="dingtalk" disabled>
         		             {t("notifications.channels.type.dingtalk")} (Coming Soon)
         		           </SelectItem>
        		          </SelectContent>
                        </Select>
                        {channelForm.type === 'telegram' && (
                            <>
                                <TextField.Input
                                    placeholder="Bot Token"
                                    value={channelForm.config.botToken}
                                    onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, botToken: e.target.value } })}
                                />
                                {channelFormErrors.botToken && <Text size="1" color="red">{channelFormErrors.botToken}</Text>}
                                <TextField.Input
                                    placeholder="Chat ID"
                                    value={channelForm.config.chatId}
                                    onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, chatId: e.target.value } })}
                                />
                                {channelFormErrors.chatId && <Text size="1" color="red">{channelFormErrors.chatId}</Text>}
                            </>
                        )}
                        {channelForm.type === 'resend' && (
                            <>
                                <TextField.Input
                                    placeholder={t("notifications.channels.apiKey")}
                                    value={channelForm.config.apiKey}
                                    onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, apiKey: e.target.value } })}
                                />
                                {channelFormErrors.apiKey && <Text size="1" color="red">{channelFormErrors.apiKey}</Text>}
                                <TextField.Input
                                    placeholder={t("notifications.channels.from")}
                                    value={channelForm.config.from}
                                    onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, from: e.target.value } })}
                                />
                                {channelFormErrors.from && <Text size="1" color="red">{channelFormErrors.from}</Text>}
                                <TextField.Input
                                    placeholder={t("notifications.channels.to")}
                                    value={channelForm.config.to}
                                    onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, to: e.target.value } })}
                                />
                                {channelFormErrors.to && <Text size="1" color="red">{channelFormErrors.to}</Text>}
                            </>
                        )}
                        {(channelForm.type === 'feishu' || channelForm.type === 'wecom') && (
                            <>
                                <TextField.Input
                                    placeholder={t("notifications.channels.webhookUrl")}
                                    value={channelForm.config.webhookUrl}
                                    onChange={(e) => setChannelForm({ ...channelForm, config: { ...channelForm.config, webhookUrl: e.target.value } })}
                                />
                                {channelFormErrors.webhookUrl && <Text size="1" color="red">{channelFormErrors.webhookUrl}</Text>}
                            </>
                        )}
                    </Flex>
                    <Flex gap="3" mt="4" justify="end">
                        <DialogClose asChild><Button variant="ghost">{t("common.cancel")}</Button></DialogClose>
                        <Button onClick={handleSaveChannel} disabled={saving}>{saving ? t("common.savingChanges") : t("common.save")}</Button>
                    </Flex>
                </DialogContent>
            </Dialog>
        )
    };

    // 渲染删除渠道对话框
    const renderDeleteChannelDialog = () => (
        <Dialog open={isDeleteChannelOpen} onOpenChange={setIsDeleteChannelOpen}>
            <DialogContent>
                <DialogTitle>{t("notifications.channels.deleteConfirmTitle")}</DialogTitle>
                <DialogDescription>{t("notifications.channels.deleteConfirmMessage")}</DialogDescription>
                <Flex gap="3" mt="4" justify="end">
                    <DialogClose asChild><Button variant="ghost">{t("common.cancel")}</Button></DialogClose>
                    <Button variant="destructive" onClick={handleConfirmDeleteChannel} disabled={saving}>{saving ? t("common.deleting") : t("common.delete")}</Button>
                </Flex>
            </DialogContent>
        </Dialog>
    );

    // 渲染模板对话框
    const renderTemplateDialog = () => {
        return (
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogContent>
                    <DialogTitle>
                        {selectedTemplate
                            ? t("notifications.templates.edit")
                            : t("notifications.templates.add")}
                    </DialogTitle>
                    <Flex direction="column" gap="3" mt="4">
                        <TextField.Input
                            placeholder={t("notifications.templates.name")}
                            value={templateForm.name}
                            onChange={(e) =>
                                setTemplateForm({ ...templateForm, name: e.target.value })
                            }
                        />
                        <Select
                            value={templateForm.type}
                            onValueChange={(value) =>
                                setTemplateForm({ ...templateForm, type: value })
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monitor">
                                    {t("notifications.settings.monitors")}
                                </SelectItem>
                                <SelectItem value="agent">
                                    {t("notifications.settings.agents")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <TextField.Input
                            placeholder={t("notifications.templates.subject")}
                            value={templateForm.subject}
                            onChange={(e) =>
                                setTemplateForm({ ...templateForm, subject: e.target.value })
                            }
                        />
                        <TextArea
                            ref={contentTextAreaRef}
                            placeholder={t("notifications.templates.content")}
                            value={templateForm.content}
                            onChange={(e) =>
                                setTemplateForm({ ...templateForm, content: e.target.value })
                            }
                            rows={8}
                        />
                        <Box>
                            <Text size="2" weight="medium" mb="2">
                                {t("notifications.templates.variables")}
                            </Text>
                            <Flex wrap="wrap" gap="2">
                                {templateVariables.map((variable) => (
                                    <Button
                                        key={variable}
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => insertVariable(variable)}
                                    >
                                        {variable}
                                    </Button>
                                ))}
                            </Flex>
                        </Box>
                    </Flex>
                    <Flex gap="3" mt="4" justify="end">
                        <DialogClose asChild>
                            <Button variant="ghost">
                                {t("common.cancel")}
                            </Button>
                        </DialogClose>
                        <Button onClick={handleSaveTemplate} disabled={saving}>
                            {saving ? t("common.savingChanges") : t("common.save")}
                        </Button>
                    </Flex>
                </DialogContent>
            </Dialog>
        );
    };

    // 渲染删除模板对话框
    const renderDeleteTemplateDialog = () => {
        return (
            <Dialog open={isDeleteTemplateOpen} onOpenChange={setIsDeleteTemplateOpen}>
                <DialogContent>
                    <DialogTitle>
                        {t("notifications.templates.deleteConfirmTitle")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("notifications.templates.deleteConfirmMessage")}
                    </DialogDescription>
                    <Flex gap="3" mt="4" justify="end">
                        <DialogClose asChild>
                            <Button variant="ghost">
                                {t("common.cancel")}
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmDeleteTemplate}
                            disabled={saving}
                        >
                            {saving ? t("common.deleting") : t("common.delete")}
                        </Button>
                    </Flex>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <Box>
            <Container>
                <Box mb="2">
                    <Flex className="flex justify-between items-center detail-header">
                        <Flex align="center" gap="2">
                            <BellIcon width="20" height="20" />
                            <Heading size="5" weight="medium">
                                {t("notifications.title")}
                            </Heading>
                        </Flex>
                        <Button
                            className="ml-auto"
                            variant="secondary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? t("common.savingChanges") : t("common.save")}
                        </Button>
                    </Flex>
                    <Text color="gray" size="2">
                        {t("notifications.description")}
                    </Text>
                </Box>

                {loading ? (
                    <Text>{t("common.loading")}...</Text>
                ) : (
                    <Card className="mb-4">
                        <Tabs defaultValue="global">
                            <TabsList className="overflow-auto">
                                <TabsTrigger value="global">
                                    {t("notifications.tabs.global")}
                                </TabsTrigger>
                                <TabsTrigger value="channels">
                                    {t("notifications.tabs.channels")}
                                </TabsTrigger>
                                <TabsTrigger value="templates">
                                    {t("notifications.tabs.templates")}
                                </TabsTrigger>
                                <TabsTrigger value="specificMonitors">
                                    {t("notifications.tabs.specificMonitors")}
                                </TabsTrigger>
                                <TabsTrigger value="specificAgents">
                                    {t("notifications.tabs.specificAgents")}
                                </TabsTrigger>
                            </TabsList>
                            <Box pt="2" px="2">
                                <TabsContent value="global">{renderGlobalSettingsTab()}</TabsContent>
                                <TabsContent value="channels">{renderChannelsTab()}</TabsContent>
                                <TabsContent value="templates">{renderTemplatesTab()}</TabsContent>
                                <TabsContent value="specificMonitors">{renderSpecificMonitorsTab()}</TabsContent>
                                <TabsContent value="specificAgents">{renderSpecificAgentsTab()}</TabsContent>
                            </Box>
                        </Tabs>
                    </Card>
                )}
            </Container>

            {renderChannelDialog()}
            {renderDeleteChannelDialog()}
            {renderTemplateDialog()}
            {renderDeleteTemplateDialog()}
        </Box>
    );
};

export default NotificationsConfig;
