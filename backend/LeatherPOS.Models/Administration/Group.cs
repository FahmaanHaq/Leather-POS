namespace LeatherPOS.Models.Administration
{
    public class Group
    {
        public int GroupID { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class GroupSaveModel
    {
        public string GroupName { get; set; } = string.Empty;
    }

    public class GroupUpdateModel
    {
        public int GroupID { get; set; }
        public string GroupName { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}
