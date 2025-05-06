import ConfluenceIconSVG from "../public/icons/connectors/confluence.svg";
import DropboxIconSVG from "../public/icons/connectors/dropbox.svg";
import FreshdeskIconSVG from "../public/icons/connectors/freshdesk.svg";
import GoogleCloudStorageIconSVG from "../public/icons/connectors/gcs.svg";
import GmailIconSVG from "../public/icons/connectors/gmail.svg";
import GoogleDriveIconSVG from "../public/icons/connectors/google-drive.svg";
import HubspotIconSVG from "../public/icons/connectors/hubspot.svg";
import JiraIconSVG from "../public/icons/connectors/jira.svg";
import NotionIconSVG from "../public/icons/connectors/notion.svg";
import OnedriveIconSVG from "../public/icons/connectors/onedrive.svg";
import S3IconSVG from "../public/icons/connectors/s3.svg";
import SalesforceIconSVG from "../public/icons/connectors/salesforce.svg";
import SlackIconSVG from "../public/icons/connectors/slack.svg";

export const CONNECTOR_MAP: Record<string, string[]> = {
  s3: ["Amazon S3", S3IconSVG],
  confluence: ["Confluence", ConfluenceIconSVG],
  dropbox: ["Dropbox", DropboxIconSVG],
  freshdesk: ["Freshdesk", FreshdeskIconSVG],
  jira: ["Jira", JiraIconSVG],
  gcs: ["Google Cloud Storage", GoogleCloudStorageIconSVG],
  gmail: ["Gmail", GmailIconSVG],
  google_drive: ["Google Drive", GoogleDriveIconSVG],
  hubspot: ["HubSpot", HubspotIconSVG],
  notion: ["Notion", NotionIconSVG],
  onedrive: ["OneDrive", OnedriveIconSVG],
  salesforce: ["Salesforce", SalesforceIconSVG],
  slack: ["Slack", SlackIconSVG],
  backblaze: ["Backblaze", "https://secure.ragie.ai/images/connectors/backblaze.svg"],
  sharepoint: ["SharePoint", "https://secure.ragie.ai/images/connectors/sharepoint.svg"],
  zendesk: ["Zendesk", "https://secure.ragie.ai/images/connectors/zendesk.svg"],
};

export default CONNECTOR_MAP;
